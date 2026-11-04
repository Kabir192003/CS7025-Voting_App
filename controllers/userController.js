const db = require('../config/db')
const asyncHandler = require('../lib/async')
const { conflict } = require('../lib/errors')
const { schemas, feedQuery, parse } = require('../lib/validate')
const C = require('../lib/constants')
const { listPolls } = require('../lib/polls')

async function streakDays(userId) {
  const { rows } = await db.query("SELECT DISTINCT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS d FROM votes WHERE user_id = ? ORDER BY d DESC LIMIT 400", [userId])
  if (!rows.length) return 0
  const day = (offset) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10)
  const days = new Set(rows.map((r) => r.d))
  const start = days.has(day(0)) ? 0 : days.has(day(1)) ? 1 : -1
  if (start < 0) return 0
  let streak = 0
  while (days.has(day(start + streak))) streak++
  return streak
}

async function stats(userId) {
  const asked = await db.one("SELECT COUNT(*) AS polls, COALESCE(SUM(votes_total), 0) AS received FROM questions WHERE user_id = ? AND status <> 'removed'", [userId])
  const cast = await db.one('SELECT COUNT(*) AS n FROM votes WHERE user_id = ?', [userId])
  const conv = await db.one('SELECT COALESCE(SUM(convincing_count), 0) AS n FROM arguments WHERE user_id = ? AND hidden = false', [userId])
  // "With the crowd": your side was the strict majority on polls with enough votes to call
  const { rows: byTopic } = await db.query(
    `SELECT c.name AS topic, COUNT(*) AS n,
            SUM(CASE WHEN (v.option_id = oa.option_id AND oa.votes_count > ob.votes_count) OR (v.option_id = ob.option_id AND ob.votes_count > oa.votes_count) THEN 1 ELSE 0 END) AS majority
     FROM votes v
     JOIN questions q ON q.question_id = v.question_id AND q.status <> 'removed'
     JOIN options oa ON oa.question_id = q.question_id AND oa.position = 0
     JOIN options ob ON ob.question_id = q.question_id AND ob.position = 1
     JOIN categories c ON c.category_id = q.category_id
     WHERE v.user_id = ? AND q.votes_total >= ? AND oa.votes_count <> ob.votes_count
     GROUP BY c.category_id, c.name ORDER BY n DESC`,
    [userId, C.MIN_VOTES_TO_CALL]
  )
  const total = byTopic.reduce((s, r) => s + r.n, 0)
  const maj = byTopic.reduce((s, r) => s + r.majority, 0)
  return {
    votes_cast: cast.n,
    polls_asked: asked.polls,
    votes_received: asked.received,
    convincing_received: conv.n,
    streak_days: await streakDays(userId),
    with_majority_pct: total ? Math.round((maj / total) * 100) : null,
    alignment: byTopic.map((r) => ({ topic: r.topic, n: r.n, pct: Math.round((r.majority / r.n) * 100) }))
  }
}

exports.me = asyncHandler(async (req, res) => {
  const id = req.user.id
  const u = await db.one('SELECT user_id, username, email, display_name, avatar_data, gender, birthday, region, bio, created_at FROM users WHERE user_id = ?', [id])
  const { rows: topics } = await db.query('SELECT c.name FROM user_preferences up JOIN categories c ON c.category_id = up.category_id WHERE up.user_id = ? AND c.name = ANY(?::text[]) ORDER BY c.sort_order', [id, C.TOPICS])
  const pending = await listPolls(id, {
    where: ['q.user_id = ?', "q.status = 'open'", 'q.closes_at <= now()', 'q.outcome_option_id IS NULL', 'q.votes_total > 0'],
    params: [id], order: 'q.closes_at DESC', limit: 3, offset: 0
  })
  res.json({
    user: {
      id: u.user_id, username: u.username, email: u.email || '', display_name: u.display_name || u.username,
      avatar: u.avatar_data || null, gender: u.gender || '', birthday: u.birthday || '',
      region: u.region || '', bio: u.bio || '', created_at: u.created_at,
      topics: topics.map((t) => t.name)
    },
    stats: await stats(id),
    pending_outcomes: pending.polls
  })
})

exports.update = asyncHandler(async (req, res) => {
  const d = parse(schemas.profile, req.body)
  const sets = [], vals = []
  const map = { display_name: 'display_name', bio: 'bio', gender: 'gender', birthday: 'birthday', region: 'region', email: 'email', avatar: 'avatar_data' }
  for (const [key, col] of Object.entries(map)) {
    if (d[key] === undefined) continue
    sets.push(`${col} = ?`)
    vals.push(d[key] === '' ? null : d[key])
  }
  if (sets.length) await db.query(`UPDATE users SET ${sets.join(', ')} WHERE user_id = ?`, [...vals, req.user.id])
  return exports.me(req, res)
})

exports.setTopics = asyncHandler(async (req, res) => {
  const { topics } = parse(schemas.topics, req.body)
  const { rows: cats } = await db.query('SELECT category_id FROM categories WHERE name = ANY(?::text[])', [topics])
  if (!cats.length) throw conflict('Unknown topics')
  await db.tx(async (tx) => {
    await tx.query('DELETE FROM user_preferences WHERE user_id = ?', [req.user.id])
    await tx.query('INSERT INTO user_preferences (user_id, category_id) SELECT ?::int, unnest(?::int[])', [req.user.id, cats.map((c) => c.category_id)])
  })
  res.json({ topics })
})

/** Your decisions: asked, voted on, or saved. */
exports.polls = asyncHandler(async (req, res) => {
  const f = parse(feedQuery, req.query)
  const tab = f.tab || 'asked'
  const spec = { limit: f.limit, offset: f.offset }
  if (tab === 'asked') Object.assign(spec, { where: ['q.user_id = ?'], params: [req.user.id], order: 'q.created_at DESC' })
  if (tab === 'voted') Object.assign(spec, { where: ['v.option_id IS NOT NULL'], order: 'v.created_at DESC' })
  if (tab === 'saved') Object.assign(spec, { where: ['s.user_id IS NOT NULL'], order: 's.created_at DESC' })
  res.json({ tab, ...(await listPolls(req.user.id, spec)) })
})
