/**
 * Vercel entry point. Vercel runs this file as a serverless function and calls the
 * exported Express app for every /api request (see vercel.json). Static files in
 * public/ are served by Vercel's CDN, not by Express.
 *
 * If the app can't start (missing environment variable, malformed DATABASE_URL, a
 * native module that failed to load), Vercel would otherwise show an opaque
 * "500 FUNCTION_INVOCATION_FAILED". Instead we log the full error and answer every
 * request with a JSON message naming the problem (first line only, no secrets).
 */
let handler
try {
  handler = require('../app')()
} catch (err) {
  console.error(JSON.stringify({ level: 'fatal', message: 'function failed to start', error: String((err && err.stack) || err) }))
  const reason = String((err && err.message) || err).split('\n')[0].slice(0, 200)
  handler = (req, res) => {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify({ error: { code: 'startup_failed', message: `The server failed to start: ${reason}` } }))
  }
}
module.exports = handler
