const bcrypt = require('bcrypt')
const db = require('../config/db')
const env = require('../config/env')
const asyncHandler = require('../lib/async')
const { AppError, unauthorized, conflict, bad } = require('../lib/errors')
const { schemas, parse } = require('../lib/validate')
const { setSession, clearSession } = require('../lib/session')

// Compared against when the username doesn't exist, so response time doesn't reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.bcryptRounds)

// Per-username lockout on top of the per-IP rate limiter: 5 misses locks the name for 15 minutes.
const failures = new Map()
const MAX_FAILS = 5
const LOCK_MS = 15 * 60 * 1000
setInterval(() => { const now = Date.now(); for (const [k, v] of failures) if (v.until && v.until < now) failures.delete(k) }, 60 * 1000).unref()

const publicUser = (u) => ({ id: u.user_id, username: u.username, display_name: u.display_name || u.username })

exports.signup = asyncHandler(async (req, res) => {
  const d = parse(schemas.signup, req.body)
  const hash = await bcrypt.hash(d.password, env.bcryptRounds)
  let created
  try {
    created = await db.one('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING user_id', [d.username, d.email || null, hash])
  } catch (err) {
    if (err.code === '23505') throw conflict('That username is taken', 'username_taken')
    throw err
  }
  const user = { user_id: created.user_id, username: d.username, display_name: null, token_version: 0 }
  setSession(res, user)
  res.status(201).json({ user: publicUser(user) })
})

exports.login = asyncHandler(async (req, res) => {
  const d = parse(schemas.login, req.body)
  const key = d.username.toLowerCase()
  const f = failures.get(key)
  if (f?.until && f.until > Date.now()) throw new AppError(429, 'locked', 'Too many failed attempts. Try again in a few minutes.')

  const user = await db.one('SELECT user_id, username, display_name, password_hash, token_version FROM users WHERE lower(username) = lower(?)', [d.username])
  const ok = await bcrypt.compare(d.password, user ? user.password_hash : DUMMY_HASH)
  if (!user || !ok) {
    const next = { count: (f?.count || 0) + 1, until: 0 }
    if (next.count >= MAX_FAILS) { next.until = Date.now() + LOCK_MS; next.count = 0 }
    failures.set(key, next)
    throw unauthorized('Wrong username or password')
  }
  failures.delete(key)
  setSession(res, user)
  res.json({ user: publicUser(user) })
})

exports.logout = (req, res) => {
  clearSession(res)
  res.json({ ok: true })
}

/** Sign out everywhere: bumps token_version so every issued token stops working. */
exports.logoutAll = asyncHandler(async (req, res) => {
  await db.query('UPDATE users SET token_version = token_version + 1 WHERE user_id = ?', [req.user.id])
  clearSession(res)
  res.json({ ok: true })
})

exports.changePassword = asyncHandler(async (req, res) => {
  const d = parse(schemas.changePassword, req.body)
  const user = await db.one('SELECT user_id, username, display_name, password_hash, token_version FROM users WHERE user_id = ?', [req.user.id])
  if (!(await bcrypt.compare(d.current, user.password_hash))) throw bad('Your current password is wrong', { current: 'Your current password is wrong' })
  if (d.next.toLowerCase() === user.username.toLowerCase()) throw bad('Password can’t match your username', { next: 'Password can’t match your username' })
  const hash = await bcrypt.hash(d.next, env.bcryptRounds)
  await db.query('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE user_id = ?', [hash, user.user_id])
  setSession(res, { ...user, token_version: user.token_version + 1 })
  res.json({ ok: true })
})
