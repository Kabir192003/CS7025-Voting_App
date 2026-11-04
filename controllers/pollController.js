const db = require('../config/db')
const env = require('../config/env')
const asyncHandler = require('../lib/async')
const { bad, forbidden, notFound, conflict, AppError } = require('../lib/errors')
const { schemas, feedQuery, parse, idParam } = require('../lib/validate')
const C = require('../lib/constants')
const { OPEN, HOT, RISING, listPolls, getPoll, getPollRow, canSeeResults, isClosed, escapeLike } = require('../lib/polls')

const MAX_POLLS_PER_DAY = 20

/* ---------- feed ---------------------------------------------------------- */

exports.list = asyncHandler(async (req, res) => {
  const f = parse(feedQuery, req.query)
  const me = req.user.id
  const where = []
  const params = []
  let order, orderParams = []
  const lens = f.lens || (f.q ? 'fresh' : 'foryou')

  switch (lens) {
    case 'foryou':
      where.push(OPEN, 'v.option_id IS NULL', 'q.user_id <> ?'); params.push(me)
      // topics you follow get a 1.6x boost; everything else still appears
      order = `(CASE WHEN EXISTS (SELECT 1 FROM user_preferences up WHERE up.user_id = ? AND up.category_id = q.category_id) THEN 1.6 ELSE 1 END) * ${HOT} DESC, q.question_id DESC`
      orderParams = [me]
      break
    case 'rising':
      where.push(OPEN, 'v.option_id IS NULL', 'q.user_id <> ?'); params.push(me)
      order = `${RISING} DESC, q.question_id DESC`
      break
    case 'fresh':
      where.push(OPEN)
      order = 'q.created_at DESC, q.question_id DESC'
      break
    case 'needs':
      where.push(OPEN, 'v.option_id IS NULL', 'q.user_id <> ?', 'q.votes_total < ?'); params.push(me, C.MIN_VOTES_TO_CALL)
      order = 'q.votes_total ASC, q.created_at DESC'
      break
    case 'close':
      where.push(OPEN, 'q.votes_total >= ?', 'abs(oa.votes_count - ob.votes_count)::float8 / greatest(q.votes_total, 1) <= ?')
      params.push(C.MIN_VOTES_TO_CALL, (C.CLOSE_MARGIN_PTS + 0.1) / 100)
      order = 'q.votes_total DESC'
      break
    case 'saved':
      where.push('s.user_id IS NOT NULL')
      order = 's.created_at DESC'
      break
  }

  if (f.topic) { where.push('c.slug = ?'); params.push(f.topic) }
  if (f.q && f.q.trim()) {
    const like = `%${escapeLike(f.q.trim())}%`
    where.push('(q.title ILIKE ? OR q.description ILIKE ?)')
    params.push(like, like)
  }

  res.json({ lens, ...(await listPolls(me, { where, params, order, orderParams, limit: f.limit, offset: f.offset })) })
})

/* ---------- create / read / edit / delete --------------------------------- */

exports.create = asyncHandler(async (req, res) => {
  const d = parse(schemas.createPoll, req.body)
  const me = req.user.id

  const { n: recent } = await db.one("SELECT COUNT(*) AS n FROM questions WHERE user_id = ? AND created_at > now() - interval '24 hours'", [me])
  if (recent >= MAX_POLLS_PER_DAY) throw new AppError(429, 'daily_limit', `You can post up to ${MAX_POLLS_PER_DAY} decisions a day.`)

  const topic = await db.one('SELECT category_id FROM categories WHERE name = ?', [d.topic])
  if (!topic) throw bad('Unknown topic', { topic: 'Unknown topic' })
  const closesAt = new Date(Date.now() + d.duration_hours * 3600 * 1000)

  const id = await db.tx(async (tx) => {
    const q = await tx.one(
      `INSERT INTO questions (user_id, title, description, is_anonymous, comments_enabled, hide_results, category_id, closes_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open') RETURNING question_id`,
      [me, d.title, d.context, d.is_anonymous, d.arguments_enabled, d.hide_results, topic.category_id, closesAt]
    )
    await tx.query('INSERT INTO options (question_id, option_text, position) VALUES (?, ?, 0), (?, ?, 1)', [q.question_id, d.option_a, q.question_id, d.option_b])
    return q.question_id
  })
  res.status(201).json({ poll: await getPoll(me, id) })
})

exports.get = asyncHandler(async (req, res) => {
  const poll = await getPoll(req.user.id, idParam(req.params.id))
  if (!poll) throw notFound('That decision doesn’t exist or was removed')
  res.json({ poll })
})

/** Context can be edited by the asker until the first vote lands. The question and options never change. */
exports.edit = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const d = parse(schemas.editPoll, req.body)
  const row = await getPollRow(req.user.id, id)
  if (!row) throw notFound()
  if (row.owner_id !== req.user.id) throw forbidden('Only the asker can edit this')
  if (row.votes_total > 0) throw conflict('Context is locked once voting starts', 'locked')
  await db.query('UPDATE questions SET description = ?, edited_at = now() WHERE question_id = ?', [d.context, id])
  res.json({ poll: await getPoll(req.user.id, id) })
})

exports.remove = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const r = await db.query('DELETE FROM questions WHERE question_id = ? AND user_id = ?', [id, req.user.id])
  if (!r.rowCount) {
    const exists = await db.one('SELECT 1 AS x FROM questions WHERE question_id = ?', [id])
    throw exists ? forbidden('Only the asker can delete this') : notFound()
  }
  res.json({ ok: true })
})

/* ---------- voting -------------------------------------------------------- */

async function dropArguments(tx, questionId, userId) {
  const r = await tx.query('DELETE FROM arguments WHERE question_id = ? AND user_id = ?', [questionId, userId])
  if (r.rowCount) await tx.query('UPDATE questions SET args_count = greatest(args_count - ?, 0) WHERE question_id = ?', [r.rowCount, questionId])
}

async function lockPoll(tx, id) {
  // Row lock serialises concurrent votes on one poll so the counters never drift.
  const q = await tx.one("SELECT question_id, user_id, status, closes_at FROM questions WHERE question_id = ? AND status <> 'removed' FOR UPDATE", [id])
  if (!q) throw notFound()
  return q
}

exports.vote = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const { option_id: optionId } = parse(schemas.vote, req.body)
  const me = req.user.id

  await db.tx(async (tx) => {
    const q = await lockPoll(tx, id)
    if (q.user_id === me) throw forbidden('You can’t vote on your own decision', 'own_poll')
    if (q.status !== 'open' || (q.closes_at && new Date(q.closes_at).getTime() <= Date.now())) throw conflict('Voting on this decision has closed', 'poll_closed')

    const opt = await tx.one('SELECT option_id FROM options WHERE option_id = ? AND question_id = ?', [optionId, id])
    if (!opt) throw bad('That option doesn’t belong to this decision', { option_id: 'That option doesn’t belong to this decision' })

    const existing = await tx.one('SELECT vote_id, option_id, created_at FROM votes WHERE question_id = ? AND user_id = ?', [id, me])
    if (!existing) {
      await tx.query('INSERT INTO votes (question_id, option_id, user_id) VALUES (?, ?, ?)', [id, optionId, me])
      await tx.query('UPDATE options SET votes_count = votes_count + 1 WHERE option_id = ?', [optionId])
      await tx.query('UPDATE questions SET votes_total = votes_total + 1 WHERE question_id = ?', [id])
      return
    }
    if (existing.option_id === optionId) return // idempotent
    if (Date.now() - new Date(existing.created_at).getTime() > env.voteGraceSeconds * 1000) throw conflict('Your vote is locked', 'vote_locked')
    // Switching sides invalidates your arguments, which were written for the old side.
    await dropArguments(tx, id, me)
    await tx.query('UPDATE votes SET option_id = ? WHERE vote_id = ?', [optionId, existing.vote_id])
    await tx.query('UPDATE options SET votes_count = greatest(votes_count - 1, 0) WHERE option_id = ?', [existing.option_id])
    await tx.query('UPDATE options SET votes_count = votes_count + 1 WHERE option_id = ?', [optionId])
  })
  res.json({ poll: await getPoll(me, id) })
})

exports.unvote = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const me = req.user.id
  await db.tx(async (tx) => {
    await lockPoll(tx, id)
    const existing = await tx.one('SELECT vote_id, option_id, created_at FROM votes WHERE question_id = ? AND user_id = ?', [id, me])
    if (!existing) return
    if (Date.now() - new Date(existing.created_at).getTime() > env.voteGraceSeconds * 1000) throw conflict('Your vote is locked', 'vote_locked')
    await dropArguments(tx, id, me)
    await tx.query('DELETE FROM votes WHERE vote_id = ?', [existing.vote_id])
    await tx.query('UPDATE options SET votes_count = greatest(votes_count - 1, 0) WHERE option_id = ?', [existing.option_id])
    await tx.query('UPDATE questions SET votes_total = greatest(votes_total - 1, 0) WHERE question_id = ?', [id])
  })
  res.json({ poll: await getPoll(me, id) })
})

/** Look at the results without voting. Recorded, so lurkers are visible in the data but never counted. */
exports.peek = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const row = await getPollRow(req.user.id, id)
  if (!row) throw notFound()
  await db.query('INSERT INTO result_peeks (question_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, req.user.id])
  res.json({ poll: await getPoll(req.user.id, id) })
})

/* ---------- save / outcome / report --------------------------------------- */

exports.save = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  if (!(await getPollRow(req.user.id, id))) throw notFound()
  await db.query('INSERT INTO saves (user_id, question_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [req.user.id, id])
  res.json({ saved: true })
})

exports.unsave = asyncHandler(async (req, res) => {
  await db.query('DELETE FROM saves WHERE user_id = ? AND question_id = ?', [req.user.id, idParam(req.params.id)])
  res.json({ saved: false })
})

/** The asker reports what they actually chose. Voters and savers are notified. */
exports.outcome = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const { option_id: optionId } = parse(schemas.outcome, req.body)
  const me = req.user.id
  await db.tx(async (tx) => {
    const q = await tx.one("SELECT question_id, user_id, status, closes_at, outcome_option_id FROM questions WHERE question_id = ? AND status <> 'removed' FOR UPDATE", [id])
    if (!q) throw notFound()
    if (q.user_id !== me) throw forbidden('Only the asker can report the outcome')
    if (!(q.closes_at && new Date(q.closes_at).getTime() <= Date.now())) throw conflict('You can report the outcome once voting has closed', 'not_closed')
    if (q.outcome_option_id) throw conflict('You already reported the outcome', 'already_reported')
    const opt = await tx.one('SELECT option_id FROM options WHERE option_id = ? AND question_id = ?', [optionId, id])
    if (!opt) throw bad('That option doesn’t belong to this decision')
    await tx.query('UPDATE questions SET outcome_option_id = ?, outcome_at = now() WHERE question_id = ?', [optionId, id])
    await tx.query(
      `INSERT INTO notifications (user_id, type, question_id)
       SELECT t.user_id, 'outcome', ?::int FROM (SELECT user_id FROM votes WHERE question_id = ? UNION SELECT user_id FROM saves WHERE question_id = ?) t WHERE t.user_id <> ?`,
      [id, id, id, me]
    )
  })
  res.json({ poll: await getPoll(me, id) })
})

exports.report = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const d = parse(schemas.report, req.body)
  const row = await getPollRow(req.user.id, id)
  if (!row) throw notFound()
  if (row.owner_id === req.user.id) throw forbidden('You can’t report your own decision')
  await db.query('INSERT INTO reports (reporter_id, question_id, target, reason, note) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING', [req.user.id, id, `q:${id}`, d.reason, d.note || null])
  const { n } = await db.one('SELECT COUNT(DISTINCT reporter_id) AS n FROM reports WHERE question_id = ? AND argument_id IS NULL', [id])
  if (n >= C.REPORT_HIDE_THRESHOLD) await db.query("UPDATE questions SET status = 'removed' WHERE question_id = ?", [id])
  res.json({ ok: true })
})

/* ---------- how the split moved ------------------------------------------- */

exports.trend = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const row = await getPollRow(req.user.id, id)
  if (!row) throw notFound()
  if (!canSeeResults(row, req.user.id)) throw forbidden('Vote to see how the split moved', 'results_hidden')

  const { rows: votes } = await db.query('SELECT o.position AS pos, v.created_at FROM votes v JOIN options o ON o.option_id = v.option_id WHERE v.question_id = ? ORDER BY v.created_at', [id])
  const start = new Date(row.created_at).getTime()
  const end = Math.max(Math.min(Date.now(), row.closes_at ? new Date(row.closes_at).getTime() : Date.now()), start + 60000)
  const points = []
  let i = 0, a = 0, b = 0
  for (let k = 1; k <= 8; k++) {
    const t = start + ((end - start) * k) / 8
    while (i < votes.length && new Date(votes[i].created_at).getTime() <= t) { votes[i].pos === 0 ? a++ : b++; i++ }
    points.push({ at: new Date(t).toISOString(), n: a + b, pct_a: a + b ? Math.round((a / (a + b)) * 100) : null })
  }
  res.json({ points })
})

exports.isClosed = isClosed
