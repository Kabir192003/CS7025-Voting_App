const env = require('../config/env')

function notFoundApi(req, res) {
  res.status(404).json({ error: { code: 'not_found', message: 'API endpoint not found' } })
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err)
  // body-parser / JSON syntax errors
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'invalid_json', message: 'Request body is not valid JSON' } })
  if (err.type === 'entity.too.large') return res.status(413).json({ error: { code: 'too_large', message: 'Request body is too large' } })
  if (err.expose && err.status) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } })
  }
  console.error(JSON.stringify({ level: 'error', id: req.id, method: req.method, path: req.path, message: err.message, stack: env.isProd ? undefined : err.stack }))
  res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong on our side. Try again.' }, requestId: req.id })
}

module.exports = { notFoundApi, errorHandler }
