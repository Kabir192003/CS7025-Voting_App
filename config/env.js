/**
 * Environment configuration. Every secret comes from the environment; there are
 * no fallbacks, so a misconfigured deploy fails at boot instead of running with
 * credentials that live in git.
 */
require('dotenv').config()
const fs = require('fs')

const isTest = process.env.NODE_ENV === 'test'
const isProd = process.env.NODE_ENV === 'production'

function need(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`)
  return value
}

function int(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) throw new Error(`Environment variable ${name} must be an integer`)
  return n
}

function bool(name, fallback = false) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
}

/**
 * TLS for Postgres. Local databases run without it. Remote ones (Supabase) are
 * always encrypted; the server certificate is verified when DB_SSL_CA is set
 * (download "SSL Certificate" from Supabase > Project Settings > Database).
 */
function sslConfig(connectionString) {
  const mode = (process.env.DB_SSL || '').toLowerCase()
  let host
  try { host = new URL(connectionString).hostname } catch {
    throw new Error('DATABASE_URL is not a valid connection string. Check for a leftover [YOUR-PASSWORD] placeholder, and URL-encode special characters in the password (@ becomes %40).')
  }
  const local = ['localhost', '127.0.0.1', '::1'].includes(host)
  if (mode === 'disable' || (!mode && local)) return false
  const ca = process.env.DB_SSL_CA
  if (ca) return { ca: ca.includes('BEGIN CERTIFICATE') ? ca.replace(/\\n/g, '\n') : fs.readFileSync(ca, 'utf8'), rejectUnauthorized: true }
  return { rejectUnauthorized: false } // encrypted, not verified: set DB_SSL_CA to verify
}

const databaseUrl = need('DATABASE_URL')
const jwtSecret = need('JWT_SECRET')
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32')

module.exports = Object.freeze({
  isProd,
  isTest,
  port: int('PORT', 4000),
  trustProxy: int('TRUST_PROXY', 0),
  autoMigrate: bool('AUTO_MIGRATE'),
  jwtSecret,
  bcryptRounds: int('BCRYPT_ROUNDS', 12),
  sessionDays: 7,
  voteGraceSeconds: int('VOTE_GRACE_SECONDS', 600),
  // Serverless instances are many and short-lived: one connection each, shared through Supabase's pooler.
  db: { connectionString: databaseUrl, ssl: sslConfig(databaseUrl), max: int('DB_POOL_SIZE', process.env.VERCEL ? 1 : 8) }
})
