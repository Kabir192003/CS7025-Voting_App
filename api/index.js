/**
 * Vercel entry point. Vercel runs this file as a serverless function and calls the
 * exported Express app for every /api request (see vercel.json). Static files in
 * public/ are served by Vercel's CDN, not by Express.
 */
module.exports = require('../app')()
