/** Test harness: isolated database, real HTTP server, tiny cookie-jar client. */
const path = require('path')

exports.setup = function setup(dbName) {
  process.env.NODE_ENV = 'test'
  const base = process.env.TEST_DATABASE_URL || 'postgresql://tot:tot_local_pw@127.0.0.1:5432'
  process.env.DATABASE_URL = `${base.replace(/\/$/, '')}/${dbName}`
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-0123'
  process.env.BCRYPT_ROUNDS = '4'
  const root = path.join(__dirname, '..')
  return { db: require(path.join(root, 'config/db')), root }
}

exports.resetDb = async (db) => {
  await db.query('DROP SCHEMA IF EXISTS public CASCADE')
  await db.query('CREATE SCHEMA public')
}

exports.startServer = async (root) => {
  const server = require(path.join(root, 'app'))().listen(0)
  await new Promise((r) => server.once('listening', r))
  return { server, base: `http://127.0.0.1:${server.address().port}` }
}

exports.Client = class Client {
  constructor(base) { this.base = base; this.cookie = null }
  async call(method, url, body, extraHeaders = {}) {
    const headers = { 'X-Requested-With': 'tot', ...extraHeaders }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (this.cookie) headers.Cookie = this.cookie
    const res = await fetch(this.base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' })
    const set = res.headers.get('set-cookie')
    if (set && set.startsWith('tot_session=')) {
      const pair = set.split(';')[0]
      this.cookie = pair === 'tot_session=' ? null : pair
    }
    let json = null
    try { json = await res.json() } catch { /* empty body */ }
    return { status: res.status, body: json, headers: res.headers }
  }
  get(url) { return this.call('GET', url) }
  post(url, body = {}) { return this.call('POST', url, body) }
  put(url, body = {}) { return this.call('PUT', url, body) }
  patch(url, body = {}) { return this.call('PATCH', url, body) }
  del(url) { return this.call('DELETE', url) }
}

let n = 0
exports.newUser = async (base, name) => {
  const c = new exports.Client(base)
  const username = (name || 'user') + '_' + (++n) + '_' + Math.random().toString(36).slice(2, 6)
  const r = await c.post('/api/auth/signup', { username, password: 'Sup3r-secret-pw' })
  if (r.status !== 201) throw new Error('signup failed: ' + JSON.stringify(r.body))
  c.username = username
  c.id = r.body.user.id
  return c
}

exports.poll = (over = {}) => ({
  title: 'Lisbon or Porto for a first long weekend?', context: 'Three nights in March, flying from Dublin.',
  option_a: 'Lisbon', option_b: 'Porto', topic: 'Travel', duration_hours: 72,
  is_anonymous: false, arguments_enabled: true, hide_results: true, ...over
})
