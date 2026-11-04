const db = require('../config/db')
const asyncHandler = require('../lib/async')
const { forbidden, notFound, conflict, bad } = require('../lib/errors')
const { schemas, parse, idParam } = require('../lib/validate')
const C = require('../lib/constants')
const { getPollRow, canSeeResults, isClosed } = require('../lib/polls')
const { wilsonLowerBound } = require('../lib/wilson')

const shape = (r, me, votesTotal) => ({
  id: r.argument_id,
  author: { username: r.username, display_name: r.display_name || r.username },
  body: r.body,
  convincing: r.convincing_count,
  marked: !!r.marked,
  mine: r.user_id === me,
  created_at: r.created_at,
  // ranked by the Wilson lower bound of "share of voters who found it convincing"
  score: wilsonLowerBound(r.convincing_count, Math.max(votesTotal, r.convincing_count, 1))
})

/** Arguments for a poll, grouped by side. Hidden until the viewer has voted (or the poll closed). */
exports.list = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const sort = req.query.sort === 'new' ? 'new' : 'top'
  const row = await getPollRow(req.user.id, id)
  if (!row) throw notFound()
  if (!canSeeResults(row, req.user.id)) throw forbidden('Vote to read the arguments', 'results_hidden')

  const { rows } = await db.query(
    `SELECT a.argument_id, a.user_id, a.option_id, a.body, a.convincing_count, a.created_at, u.username, u.display_name,
            (m.user_id IS NOT NULL) AS marked
     FROM arguments a JOIN users u ON u.user_id = a.user_id
     LEFT JOIN argument_marks m ON m.argument_id = a.argument_id AND m.user_id = ?
     WHERE a.question_id = ? AND a.hidden = false ORDER BY a.created_at DESC LIMIT 200`,
    [req.user.id, id]
  )
  const order = sort === 'top'
    ? (x, y) => y.score - x.score || y.convincing - x.convincing || new Date(y.created_at) - new Date(x.created_at)
    : (x, y) => new Date(y.created_at) - new Date(x.created_at)
  const side = (optionId) => rows.filter((r) => r.option_id === optionId).map((r) => shape(r, req.user.id, row.votes_total)).sort(order)
  const a = side(row.a_id), b = side(row.b_id)
  res.json({ a, b, total: a.length + b.length, sort })
})

exports.create = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const { body } = parse(schemas.argument, req.body)
  const me = req.user.id
  const row = await getPollRow(me, id)
  if (!row) throw notFound()
  if (!row.comments_enabled) throw forbidden('The asker turned arguments off for this decision', 'arguments_off')
  if (isClosed(row)) throw conflict('This decision has closed', 'poll_closed')
  if (row.my_option_id == null) throw forbidden('Vote first, then make your case', 'vote_required')

  const { n } = await db.one('SELECT COUNT(*) AS n FROM arguments WHERE question_id = ? AND user_id = ?', [id, me])
  if (n >= C.MAX_ARGUMENTS_PER_USER) throw conflict(`You can post up to ${C.MAX_ARGUMENTS_PER_USER} arguments per decision`, 'argument_limit')

  const argId = await db.tx(async (tx) => {
    const r = await tx.one('INSERT INTO arguments (question_id, option_id, user_id, body) VALUES (?, ?, ?, ?) RETURNING argument_id', [id, row.my_option_id, me, body])
    await tx.query('UPDATE questions SET args_count = args_count + 1 WHERE question_id = ?', [id])
    return r.argument_id
  })
  const created = await db.one(
    `SELECT a.argument_id, a.user_id, a.option_id, a.body, a.convincing_count, a.created_at, u.username, u.display_name, false AS marked
     FROM arguments a JOIN users u ON u.user_id = a.user_id WHERE a.argument_id = ?`, [argId])
  res.status(201).json({ argument: shape(created, me, row.votes_total), side: row.my_option_id === row.a_id ? 'a' : 'b' })
})

/** The author or the poll's asker can remove an argument. */
exports.remove = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const a = await db.one('SELECT a.argument_id, a.user_id, a.question_id, q.user_id AS owner_id FROM arguments a JOIN questions q ON q.question_id = a.question_id WHERE a.argument_id = ?', [id])
  if (!a) throw notFound()
  if (a.user_id !== req.user.id && a.owner_id !== req.user.id) throw forbidden('You can only remove your own arguments')
  await db.tx(async (tx) => {
    await tx.query('DELETE FROM arguments WHERE argument_id = ?', [id])
    await tx.query('UPDATE questions SET args_count = greatest(args_count - 1, 0) WHERE question_id = ?', [a.question_id])
  })
  res.json({ ok: true })
})

/** Toggle "convincing". You can't mark your own argument. */
exports.toggleConvincing = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const me = req.user.id
  const a = await db.one('SELECT argument_id, user_id, question_id, hidden FROM arguments WHERE argument_id = ?', [id])
  if (!a || a.hidden) throw notFound()
  if (a.user_id === me) throw forbidden('You can’t mark your own argument', 'own_argument')
  const row = await getPollRow(me, a.question_id)
  if (!row || !canSeeResults(row, me)) throw forbidden('Vote to read the arguments', 'results_hidden')

  const marked = await db.tx(async (tx) => {
    const ins = await tx.query('INSERT INTO argument_marks (argument_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, me])
    if (ins.rowCount) {
      await tx.query('UPDATE arguments SET convincing_count = convincing_count + 1 WHERE argument_id = ?', [id])
      return true
    }
    await tx.query('DELETE FROM argument_marks WHERE argument_id = ? AND user_id = ?', [id, me])
    await tx.query('UPDATE arguments SET convincing_count = greatest(convincing_count - 1, 0) WHERE argument_id = ?', [id])
    return false
  })
  const { convincing_count: convincing } = await db.one('SELECT convincing_count FROM arguments WHERE argument_id = ?', [id])
  res.json({ marked, convincing })
})

exports.report = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id)
  const d = parse(schemas.report, req.body)
  const a = await db.one('SELECT argument_id, user_id, question_id FROM arguments WHERE argument_id = ? AND hidden = false', [id])
  if (!a) throw notFound()
  if (a.user_id === req.user.id) throw bad('You can’t report your own argument')
  await db.query('INSERT INTO reports (reporter_id, question_id, argument_id, target, reason, note) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING', [req.user.id, a.question_id, id, `a:${id}`, d.reason, d.note || null])
  const { n } = await db.one('SELECT COUNT(DISTINCT reporter_id) AS n FROM reports WHERE argument_id = ?', [id])
  if (n >= C.REPORT_HIDE_THRESHOLD) {
    await db.tx(async (tx) => {
      const r = await tx.query('UPDATE arguments SET hidden = true WHERE argument_id = ? AND hidden = false', [id])
      if (r.rowCount) await tx.query('UPDATE questions SET args_count = greatest(args_count - 1, 0) WHERE question_id = ?', [a.question_id])
    })
  }
  res.json({ ok: true })
})
