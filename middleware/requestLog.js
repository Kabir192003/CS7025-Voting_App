const crypto = require('crypto')
const env = require('../config/env')

/** Attach a request id and emit one JSON log line per request. Bodies and tokens are never logged. */
module.exports = (req, res, next) => {
  req.id = crypto.randomUUID()
  res.setHeader('X-Request-Id', req.id)
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    if (env.isTest || !req.originalUrl.startsWith('/api')) return
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    console.log(JSON.stringify({ level: 'info', id: req.id, method: req.method, path: req.originalUrl.split('?')[0], status: res.statusCode, ms: Math.round(ms), user: req.user?.id }))
  })
  next()
}
