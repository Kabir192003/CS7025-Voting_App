const jwt = require('jsonwebtoken')
const env = require('../config/env')

const COOKIE = 'tot_session'
const MAX_AGE_MS = env.sessionDays * 24 * 60 * 60 * 1000

function sign(user) {
  return jwt.sign({ sub: user.user_id, tv: user.token_version }, env.jwtSecret, { expiresIn: `${env.sessionDays}d`, algorithm: 'HS256' })
}

function verify(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] })
}

/** Tiny cookie parser: avoids a dependency for a single cookie. */
function readCookie(req, name) {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()) } catch { return null }
    }
  }
  return null
}

function setSession(res, user) {
  res.cookie(COOKIE, sign(user), { httpOnly: true, sameSite: 'strict', secure: env.isProd, maxAge: MAX_AGE_MS, path: '/' })
}

function clearSession(res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'strict', secure: env.isProd, path: '/' })
}

module.exports = { COOKIE, sign, verify, readCookie, setSession, clearSession }
