/** Express app factory. Kept separate from server.js so tests can mount it on any port. */
const path = require('path')
const express = require('express')
const env = require('./config/env')
const security = require('./middleware/security')
const requestLog = require('./middleware/requestLog')
const { notFoundApi, errorHandler } = require('./middleware/error')
const api = require('./routes/api')

function createApp() {
  const app = express()
  app.disable('x-powered-by')
  if (env.trustProxy) app.set('trust proxy', env.trustProxy)

  app.use(requestLog)
  app.use(security.headers)
  app.use('/api', security.globalLimiter, express.json({ limit: '300kb' }), security.csrfGuard, (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  }, api)
  app.use('/api', notFoundApi)

  // old URLs from the first version keep working
  const redirects = { '/question.html': 'poll.html', '/ask-question.html': 'ask.html', '/edit-profile.html': 'profile.html' }
  app.get(Object.keys(redirects), (req, res) => {
    const target = redirects[req.path]
    res.redirect(301, req.query.id ? `/${target}?id=${encodeURIComponent(req.query.id)}` : `/${target}`)
  })
  app.get('/', (req, res) => res.redirect('/home.html'))

  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: env.isProd ? '1h' : 0,
    setHeaders(res, file) { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache') }
  }))
  app.use(errorHandler)
  return app
}

module.exports = createApp
