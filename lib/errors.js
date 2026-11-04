/** Operational errors that are safe to show to a client. Anything else becomes a generic 500. */
class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
    this.expose = true
  }
}

const bad = (message, fields) => new AppError(400, 'invalid_input', message, fields)
const unauthorized = (message = 'Sign in to continue') => new AppError(401, 'unauthorized', message)
const forbidden = (message = 'You can’t do that', code = 'forbidden') => new AppError(403, code, message)
const notFound = (message = 'Not found') => new AppError(404, 'not_found', message)
const conflict = (message, code = 'conflict') => new AppError(409, code, message)

module.exports = { AppError, bad, unauthorized, forbidden, notFound, conflict }
