const db = require('../config/db')
const asyncHandler = require('../lib/async')
const C = require('../lib/constants')

exports.health = asyncHandler(async (req, res) => {
  await db.query('SELECT 1')
  res.json({ ok: true })
})

/** The twelve topics, optionally with week-over-week vote trend. */
exports.topics = asyncHandler(async (req, res) => {
  const { rows: topics } = await db.query('SELECT category_id AS id, name, slug FROM categories WHERE name = ANY(?::text[]) ORDER BY sort_order', [C.TOPICS])
  if (req.query.trend !== '1') return res.json({ topics })
  const { rows } = await db.query(
    `SELECT q.category_id AS id,
            SUM(CASE WHEN v.created_at > now() - interval '7 days' THEN 1 ELSE 0 END) AS cur,
            SUM(CASE WHEN v.created_at <= now() - interval '7 days' THEN 1 ELSE 0 END) AS prev
     FROM votes v JOIN questions q ON q.question_id = v.question_id
     WHERE v.created_at > now() - interval '14 days' GROUP BY q.category_id`
  )
  const byId = Object.fromEntries(rows.map((r) => [r.id, { cur: Number(r.cur), prev: Number(r.prev) }]))
  res.json({
    topics: topics.map((t) => {
      const { cur = 0, prev = 0 } = byId[t.id] || {}
      return { ...t, votes_7d: cur, change_pct: prev >= 5 ? Math.round(((cur - prev) / prev) * 100) : null }
    })
  })
})

exports.notifications = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT n.notification_id, n.type, n.created_at, n.read_at, q.question_id, q.title,
            o.option_text AS outcome_label, (v.option_id = q.outcome_option_id) AS you_matched, (v.option_id IS NOT NULL) AS you_voted
     FROM notifications n
     JOIN questions q ON q.question_id = n.question_id
     LEFT JOIN options o ON o.option_id = q.outcome_option_id
     LEFT JOIN votes v ON v.question_id = q.question_id AND v.user_id = n.user_id
     WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 20`, [req.user.id])
  const { unread } = await db.one('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id])
  res.json({
    unread,
    items: rows.map((r) => ({
      id: r.notification_id, type: r.type, poll_id: r.question_id, title: r.title, outcome_label: r.outcome_label,
      you_voted: !!r.you_voted, you_matched: !!r.you_matched, read: !!r.read_at, created_at: r.created_at
    }))
  })
})

exports.readNotifications = asyncHandler(async (req, res) => {
  await db.query('UPDATE notifications SET read_at = now() WHERE user_id = ? AND read_at IS NULL', [req.user.id])
  res.json({ ok: true })
})
