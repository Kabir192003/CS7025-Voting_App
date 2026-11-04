/**
 * Poll reads. One query shape feeds the feed, the poll page and the profile so
 * every surface agrees on what a viewer is allowed to see.
 */
const db = require('../config/db')
const env = require('../config/env')
const { verdict } = require('./verdict')

const OPEN = `(q.status = 'open' AND (q.closes_at IS NULL OR q.closes_at > now()))`
const AGE_H = `(extract(epoch FROM (now() - q.created_at)) / 3600.0)`
const HOT = `((1 + q.votes_total + 2 * q.args_count) / power(${AGE_H} + 2, 1.5))`
// Rising: only the last 48 hours of activity count, with a small boost for near-even splits.
const RISING = `((1
    + (SELECT COUNT(*) FROM votes rv WHERE rv.question_id = q.question_id AND rv.created_at > now() - interval '48 hours')
    + 2 * (SELECT COUNT(*) FROM arguments ra WHERE ra.question_id = q.question_id AND ra.hidden = false AND ra.created_at > now() - interval '48 hours'))
  / power(${AGE_H} + 2, 1.5))
  * (1 + 0.3 * (1 - abs(oa.votes_count - ob.votes_count)::float8 / greatest(q.votes_total, 1)))`

const COLUMNS = `
  q.question_id, q.user_id AS owner_id, q.title, q.description, q.is_anonymous, q.comments_enabled,
  q.hide_results, q.status, q.closes_at, q.created_at, q.votes_total, q.args_count,
  q.outcome_option_id, q.outcome_at, q.edited_at, c.name AS topic, c.slug AS topic_slug,
  u.username AS owner_username, u.display_name AS owner_display,
  oa.option_id AS a_id, oa.option_text AS a_text, oa.votes_count AS a_votes,
  ob.option_id AS b_id, ob.option_text AS b_text, ob.votes_count AS b_votes,
  v.option_id AS my_option_id, v.created_at AS my_voted_at,
  (p.user_id IS NOT NULL) AS peeked, (s.user_id IS NOT NULL) AS saved`

const FROM = `
  FROM questions q
  JOIN users u ON u.user_id = q.user_id
  JOIN options oa ON oa.question_id = q.question_id AND oa.position = 0
  JOIN options ob ON ob.question_id = q.question_id AND ob.position = 1
  LEFT JOIN categories c ON c.category_id = q.category_id
  LEFT JOIN votes v ON v.question_id = q.question_id AND v.user_id = ?
  LEFT JOIN result_peeks p ON p.question_id = q.question_id AND p.user_id = ?
  LEFT JOIN saves s ON s.question_id = q.question_id AND s.user_id = ?`

const isClosed = (r) => r.status !== 'open' || (r.closes_at != null && new Date(r.closes_at).getTime() <= Date.now())
const canSeeResults = (r, viewerId) => isClosed(r) || r.owner_id === viewerId || r.my_option_id != null || !!r.peeked || !r.hide_results

function serializePoll(r, viewerId) {
  const closed = isClosed(r)
  const mine = r.owner_id === viewerId
  const revealed = canSeeResults(r, viewerId)
  const hasVote = r.my_option_id != null
  const graceMs = env.voteGraceSeconds * 1000
  const votedAt = r.my_voted_at ? new Date(r.my_voted_at).getTime() : null
  const changeUntil = hasVote ? votedAt + graceMs : null

  const options = [
    { id: r.a_id, label: r.a_text, position: 0 },
    { id: r.b_id, label: r.b_text, position: 1 }
  ]

  let results = null
  if (revealed) {
    const v = verdict(r.a_votes, r.b_votes)
    results = {
      a: { id: r.a_id, votes: r.a_votes, pct: v.pctA },
      b: { id: r.b_id, votes: r.b_votes, pct: v.pctB },
      n: v.n, margin: v.margin, verdict: { code: v.code, label: v.label, leader: v.leader }
    }
  }

  let outcome = null
  if (r.outcome_option_id) {
    outcome = { option_id: r.outcome_option_id, label: r.outcome_option_id === r.a_id ? r.a_text : r.b_text, at: r.outcome_at }
  }

  return {
    id: r.question_id,
    title: r.title,
    context: r.description || '',
    topic: r.topic,
    topic_slug: r.topic_slug,
    author: r.is_anonymous ? null : { username: r.owner_username, display_name: r.owner_display || r.owner_username },
    is_anonymous: !!r.is_anonymous,
    mine,
    created_at: r.created_at,
    closes_at: r.closes_at,
    closed,
    archived: r.status === 'archived',
    arguments_enabled: !!r.comments_enabled,
    hide_results: !!r.hide_results,
    options,
    votes_total: r.votes_total,
    args_count: r.args_count,
    my_vote: hasVote ? r.my_option_id : null,
    can_vote: !closed && !mine,
    change_until: hasVote && changeUntil > Date.now() ? new Date(changeUntil).toISOString() : null,
    saved: !!r.saved,
    revealed,
    results,
    outcome,
    edited: !!r.edited_at
  }
}

/** Escape LIKE wildcards so user text matches literally (Postgres escapes with a backslash by default). */
const escapeLike = (s) => s.replace(/[\\%_]/g, (m) => '\\' + m)

/**
 * @param {number} viewerId
 * @param {{where?: string[], params?: any[], order: string, orderParams?: any[], limit: number, offset: number}} spec
 */
async function listPolls(viewerId, spec) {
  const where = ["q.status <> 'removed'", ...(spec.where || [])]
  const whereSql = 'WHERE ' + where.join(' AND ')
  const viewer = [viewerId, viewerId, viewerId]

  const { rows } = await db.query(
    `SELECT ${COLUMNS} ${FROM} ${whereSql} ORDER BY ${spec.order} LIMIT ? OFFSET ?`,
    [...viewer, ...(spec.params || []), ...(spec.orderParams || []), spec.limit + 1, spec.offset]
  )
  const { total } = await db.one(`SELECT COUNT(*) AS total ${FROM} ${whereSql}`, [...viewer, ...(spec.params || [])])

  const hasMore = rows.length > spec.limit
  const page = hasMore ? rows.slice(0, spec.limit) : rows
  return {
    polls: page.map((r) => serializePoll(r, viewerId)),
    total,
    has_more: hasMore,
    next_offset: hasMore ? spec.offset + spec.limit : null
  }
}

/** Raw row for one poll as seen by `viewerId`, or undefined. Removed polls do not exist. */
const getPollRow = (viewerId, id) =>
  db.one(`SELECT ${COLUMNS} ${FROM} WHERE q.question_id = ? AND q.status <> 'removed'`, [viewerId, viewerId, viewerId, id])

async function getPoll(viewerId, id) {
  const row = await getPollRow(viewerId, id)
  return row ? serializePoll(row, viewerId) : null
}

module.exports = { OPEN, HOT, RISING, listPolls, getPoll, getPollRow, serializePoll, canSeeResults, isClosed, escapeLike }
