const db = require('../config/db')
const { unauthorized } = require('../lib/errors')
const asyncHandler = require('../lib/async')
const { COOKIE, verify, readCookie } = require('../lib/session')

/**
 * Authenticate from the httpOnly session cookie (or a Bearer token for API
 * clients). The token carries the user's token_version, so changing a password
 * or signing out everywhere invalidates every older token.
 */
module.exports = asyncHandler(async (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null
  const token = readCookie(req, COOKIE) || bearer
  if (!token) throw unauthorized()

  let claims
  try { claims = verify(token) } catch { throw unauthorized('Your session has expired. Sign in again.') }

  const user = await db.one('SELECT user_id, username, token_version FROM users WHERE user_id = ?', [claims.sub])
  if (!user || user.token_version !== claims.tv) throw unauthorized('Your session has expired. Sign in again.')
  req.user = { id: user.user_id, username: user.username, token_version: user.token_version }
  next()
})
