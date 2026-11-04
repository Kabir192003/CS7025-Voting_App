const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const env = require('../config/env')
const { AppError, forbidden } = require('../lib/errors')

const headers = helmet({
  useDefaults: false,
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ['https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      ...(env.isProd ? { upgradeInsecureRequests: [] } : {})
    }
  },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: env.isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
  xContentTypeOptions: true,
  xFrameOptions: { action: 'deny' },
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
  originAgentCluster: true
})

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * CSRF defence in depth on top of SameSite=Strict cookies: state-changing API
 * calls must carry a custom header (which a cross-site form cannot set), be JSON,
 * and come from this origin when the browser tells us the origin.
 */
function csrfGuard(req, res, next) {
  if (!MUTATING.has(req.method)) return next()
  if (req.headers['x-requested-with'] !== 'tot') return next(forbidden('Missing request header', 'csrf'))
  const origin = req.headers.origin
  if (origin) {
    let host
    try { host = new URL(origin).host } catch { return next(forbidden('Bad origin', 'csrf')) }
    if (host !== req.headers.host) return next(forbidden('Cross-origin request blocked', 'csrf'))
  }
  const hasBody = Number(req.headers['content-length'] || 0) > 0 || req.headers['transfer-encoding']
  if (hasBody && !req.is('application/json')) return next(new AppError(415, 'unsupported_media_type', 'Send JSON'))
  next()
}

const limit = (windowMs, max, message, keyGenerator) => rateLimit({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  keyGenerator,
  // Tests bypass limits unless a test opts in with TEST_RATE_LIMITS=1.
  skip: () => env.isTest && process.env.TEST_RATE_LIMITS !== '1',
  handler: (req, res, next) => next(new AppError(429, 'rate_limited', message))
})

const byUserOrIp = (req) => (req.user ? `u${req.user.id}` : req.ip)

module.exports = {
  headers,
  csrfGuard,
  globalLimiter: limit(60 * 1000, 600, 'Too many requests. Slow down a little.'),
  authLimiter: limit(15 * 60 * 1000, 30, 'Too many sign-in attempts. Try again in a few minutes.'),
  signupLimiter: limit(60 * 60 * 1000, 10, 'Too many accounts created from this network. Try again later.'),
  voteLimiter: limit(60 * 1000, 90, 'You’re voting very fast. Take a breath.', byUserOrIp),
  writeLimiter: limit(60 * 1000, 20, 'You’re posting very fast. Try again in a minute.', byUserOrIp)
}
