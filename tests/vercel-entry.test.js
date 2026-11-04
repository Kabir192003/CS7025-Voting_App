const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const os = require('node:os')

const ENTRY = path.join(__dirname, '..', 'api', 'index.js')

// Load api/index.js in a clean process with a given environment and call its handler.
function run(env) {
  const code = `
    const handler = require(${JSON.stringify(ENTRY)})
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v }, end(b) { console.log(JSON.stringify({ status: this.statusCode, body: b })) } }
    handler({ method: 'GET', url: '/api/health', headers: {} }, res)
  `
  const r = spawnSync(process.execPath, ['-e', code], { cwd: os.tmpdir(), env: { PATH: process.env.PATH, NODE_ENV: 'test', ...env }, encoding: 'utf8' })
  return r
}

test('a misconfigured Vercel function answers with a readable JSON error instead of crashing', () => {
  const r = run({}) // no DATABASE_URL, no JWT_SECRET
  const out = JSON.parse(r.stdout.trim().split('\n').pop())
  assert.equal(out.status, 500)
  const body = JSON.parse(out.body)
  assert.equal(body.error.code, 'startup_failed')
  assert.match(body.error.message, /Missing required environment variable DATABASE_URL/)
})

test('a malformed DATABASE_URL is explained, and the secret value is never echoed', () => {
  const r = run({ DATABASE_URL: 'postgresql://postgres.ref:s3cr3tpw@@@bad host', JWT_SECRET: 'x'.repeat(40) })
  const out = JSON.parse(r.stdout.trim().split('\n').pop())
  const body = JSON.parse(out.body)
  assert.match(body.error.message, /DATABASE_URL is not a valid connection string/)
  assert.ok(!out.body.includes('s3cr3tpw'), 'the password must not appear in the response')
})
