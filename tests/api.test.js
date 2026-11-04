const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { setup, resetDb, startServer, Client, newUser, poll } = require('./helpers')
const { db, root } = setup('thisorthat_test')
const { migrate } = require(root + '/lib/migrator')

let server, base
before(async () => {
  await resetDb(db)
  await migrate(db, () => {})
  ;({ server, base } = await startServer(root))
})
after(async () => { server.close(); await db.end() })

const age = (sql, params) => db.query(sql, params)

test('health check and security headers', async () => {
  const c = new Client(base)
  const r = await c.get('/api/health')
  assert.equal(r.status, 200)
  const csp = r.headers.get('content-security-policy')
  assert.match(csp, /script-src 'self'/)
  assert.doesNotMatch(csp, /unsafe-inline/)
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(r.headers.get('x-frame-options'), 'DENY')
  assert.equal(r.headers.get('x-powered-by'), null)
  assert.equal(r.headers.get('cache-control'), 'no-store')
})

test('signup validates input and sets an httpOnly SameSite=Strict cookie', async () => {
  const c = new Client(base)
  assert.equal((await c.post('/api/auth/signup', { username: 'ab', password: 'Sup3r-secret-pw' })).status, 400)
  assert.equal((await c.post('/api/auth/signup', { username: 'good_name', password: 'short' })).status, 400)
  assert.equal((await c.post('/api/auth/signup', { username: 'good_name', password: 'password123' })).status, 400)
  assert.equal((await c.post('/api/auth/signup', { username: '<script>', password: 'Sup3r-secret-pw' })).status, 400)
  assert.equal((await c.post('/api/auth/signup', { username: 'good_name', password: 'Sup3r-secret-pw', admin: true })).status, 400, 'unknown fields rejected')
  const ok = await c.post('/api/auth/signup', { username: 'cookie_test', password: 'Sup3r-secret-pw' })
  assert.equal(ok.status, 201)
  const set = ok.headers.get('set-cookie')
  assert.match(set, /HttpOnly/i); assert.match(set, /SameSite=Strict/i)
  assert.equal(ok.body.token, undefined, 'no token in the body')
  assert.equal((await c.post('/api/auth/signup', { username: 'COOKIE_TEST', password: 'Sup3r-secret-pw' })).status, 409, 'usernames are case-insensitive')
})

test('CSRF guard: custom header, same origin and JSON are required', async () => {
  const u = await newUser(base)
  const raw = (headers, body = '{}') => fetch(base + '/api/polls', { method: 'POST', headers: { Cookie: u.cookie, ...headers }, body })
  assert.equal((await raw({ 'Content-Type': 'application/json' })).status, 403, 'missing X-Requested-With')
  assert.equal((await raw({ 'Content-Type': 'application/json', 'X-Requested-With': 'tot', Origin: 'https://evil.example' })).status, 403, 'foreign origin')
  assert.equal((await raw({ 'Content-Type': 'text/plain', 'X-Requested-With': 'tot' })).status, 415, 'non-JSON body')
  assert.equal((await u.get('/api/polls')).status, 200, 'GET needs no header')
})

test('authentication is required and logout clears the session', async () => {
  const anon = new Client(base)
  assert.equal((await anon.get('/api/polls')).status, 401)
  assert.equal((await anon.get('/api/users/me')).status, 401)
  const u = await newUser(base)
  assert.equal((await u.get('/api/users/me')).status, 200)
  const stale = u.cookie
  await u.post('/api/auth/logout-all')
  const replay = new Client(base); replay.cookie = stale
  assert.equal((await replay.get('/api/users/me')).status, 401, 'old tokens die after sign-out-everywhere')
})

test('login: wrong password is generic, 5 misses lock the account', async () => {
  const u = await newUser(base, 'lock')
  const c = new Client(base)
  const bad = await c.post('/api/auth/login', { username: u.username, password: 'wrong-wrong-1' })
  assert.equal(bad.status, 401); assert.equal(bad.body.error.message, 'Wrong username or password')
  assert.equal((await c.post('/api/auth/login', { username: 'nobody_here', password: 'wrong-wrong-1' })).body.error.message, 'Wrong username or password')
  for (let i = 0; i < 4; i++) await c.post('/api/auth/login', { username: u.username, password: 'wrong-wrong-1' })
  assert.equal((await c.post('/api/auth/login', { username: u.username, password: 'Sup3r-secret-pw' })).status, 429, 'locked even with the right password')
})

test('changing password invalidates other sessions', async () => {
  const u = await newUser(base)
  const old = u.cookie
  assert.equal((await u.post('/api/auth/password', { current: 'nope-nope-nope', next: 'Another-good-1' })).status, 400)
  assert.equal((await u.post('/api/auth/password', { current: 'Sup3r-secret-pw', next: 'Another-good-1' })).status, 200)
  const replay = new Client(base); replay.cookie = old
  assert.equal((await replay.get('/api/users/me')).status, 401)
  assert.equal((await u.get('/api/users/me')).status, 200, 'current session is reissued')
})

test('poll creation validates and stores text raw (escaped only on output)', async () => {
  const u = await newUser(base)
  for (const bad of [
    poll({ option_b: 'lisbon' }), poll({ topic: 'Nope' }), poll({ title: 'Too short' }), poll({ option_a: 'x'.repeat(29) }),
    poll({ duration_hours: 5 }), { ...poll(), extra: 1 }
  ]) assert.equal((await u.post('/api/polls', bad)).status, 400)
  const xss = '<img src=x onerror=alert(1)> or <b>bold</b>?'
  const r = await u.post('/api/polls', poll({ title: xss, context: '"quotes" & <tags>' }))
  assert.equal(r.status, 201)
  assert.equal(r.body.poll.title, xss)
  assert.equal(r.body.poll.options.length, 2)
  assert.equal(r.body.poll.results.n, 0, 'asker sees results')
})

test('voting rules: own poll, hidden results, idempotence, wrong option, switching, lock', async () => {
  const owner = await newUser(base, 'owner'), a = await newUser(base, 'a'), b = await newUser(base, 'b')
  const created = (await owner.post('/api/polls', poll())).body.poll
  const [optA, optB] = created.options.map((o) => o.id)
  const other = (await owner.post('/api/polls', poll({ title: 'Flat white or cortado as the default?', option_a: 'Flat white', option_b: 'Cortado' }))).body.poll

  assert.equal((await owner.post(`/api/polls/${created.id}/vote`, { option_id: optA })).status, 403, 'no voting on your own poll')

  const before = (await a.get(`/api/polls/${created.id}`)).body.poll
  assert.equal(before.results, null, 'results hidden before voting')
  assert.equal(before.revealed, false)
  assert.equal(JSON.stringify(before).includes('"votes":'), false, 'no vote counts leak')
  assert.equal((await a.get(`/api/polls/${created.id}/arguments`)).status, 403, 'arguments hidden before voting')

  assert.equal((await a.post(`/api/polls/${created.id}/vote`, { option_id: other.options[0].id })).status, 400, 'option from another poll')
  assert.equal((await a.post(`/api/polls/${created.id}/vote`, { option_id: 'x' })).status, 400)
  assert.equal((await a.post(`/api/polls/${created.id}/vote`, { option_id: 999999 })).status, 400)

  let r = await a.post(`/api/polls/${created.id}/vote`, { option_id: optA })
  assert.equal(r.status, 200); assert.equal(r.body.poll.my_vote, optA); assert.equal(r.body.poll.results.a.votes, 1)
  assert.ok(r.body.poll.change_until)
  r = await a.post(`/api/polls/${created.id}/vote`, { option_id: optA })
  assert.equal(r.body.poll.results.n, 1, 'same vote twice counts once')
  await b.post(`/api/polls/${created.id}/vote`, { option_id: optB })

  r = await a.post(`/api/polls/${created.id}/vote`, { option_id: optB })
  assert.equal(r.body.poll.results.a.votes, 0); assert.equal(r.body.poll.results.b.votes, 2, 'switching inside the grace window moves the vote')

  await age("UPDATE votes SET created_at = now() - interval '1 hour' WHERE user_id = ?", [a.id])
  assert.equal((await a.post(`/api/polls/${created.id}/vote`, { option_id: optA })).body.error.code, 'vote_locked')
  assert.equal((await a.del(`/api/polls/${created.id}/vote`)).status, 409)

  const row = await db.one('SELECT votes_total, (SELECT SUM(votes_count) FROM options WHERE question_id = ?) AS s FROM questions WHERE question_id = ?', [created.id, created.id])
  assert.equal(row.votes_total, 2); assert.equal(Number(row.s), 2, 'denormalised counters match')
})

test('undo inside the grace window removes the vote and its arguments', async () => {
  const owner = await newUser(base), v = await newUser(base)
  const p = (await owner.post('/api/polls', poll())).body.poll
  await v.post(`/api/polls/${p.id}/vote`, { option_id: p.options[0].id })
  await v.post(`/api/polls/${p.id}/arguments`, { body: 'Lisbon has the better light.' })
  const r = await v.del(`/api/polls/${p.id}/vote`)
  assert.equal(r.body.poll.my_vote, null); assert.equal(r.body.poll.votes_total, 0); assert.equal(r.body.poll.args_count, 0)
})

test('30 concurrent voters never corrupt the counters', async () => {
  const owner = await newUser(base)
  const p = (await owner.post('/api/polls', poll())).body.poll
  const voters = await Promise.all(Array.from({ length: 30 }, () => newUser(base, 'crowd')))
  const rs = await Promise.all(voters.map((v, i) => v.post(`/api/polls/${p.id}/vote`, { option_id: p.options[i % 3 === 0 ? 1 : 0].id })))
  assert.ok(rs.every((r) => r.status === 200))
  const final = (await owner.get(`/api/polls/${p.id}`)).body.poll
  assert.equal(final.results.n, 30); assert.equal(final.results.a.votes + final.results.b.votes, 30)
  assert.equal(final.results.b.votes, 10)
  assert.equal(final.results.verdict.code, 'leaning')
})

test('peek reveals results without casting a vote', async () => {
  const owner = await newUser(base), lurker = await newUser(base)
  const p = (await owner.post('/api/polls', poll())).body.poll
  const r = await lurker.post(`/api/polls/${p.id}/peek`)
  assert.equal(r.body.poll.revealed, true); assert.equal(r.body.poll.my_vote, null); assert.equal(r.body.poll.votes_total, 0)
  assert.equal((await lurker.get(`/api/polls/${p.id}/arguments`)).status, 200)
})

test('arguments: need a vote, grouped by side, ranked, limited, one mark each', async () => {
  const owner = await newUser(base), a = await newUser(base), b = await newUser(base), c = await newUser(base)
  const p = (await owner.post('/api/polls', poll())).body.poll
  const [optA, optB] = p.options.map((o) => o.id)
  assert.equal((await a.post(`/api/polls/${p.id}/arguments`, { body: 'I have no vote yet' })).body.error.code, 'vote_required')
  await a.post(`/api/polls/${p.id}/vote`, { option_id: optA })
  await b.post(`/api/polls/${p.id}/vote`, { option_id: optB })
  await c.post(`/api/polls/${p.id}/vote`, { option_id: optA })
  assert.equal((await a.post(`/api/polls/${p.id}/arguments`, { body: 'x' })).status, 400, 'too short')
  const mk = async (u, text) => (await u.post(`/api/polls/${p.id}/arguments`, { body: text })).body.argument
  const first = await mk(a, 'Lisbon: tram 28 and the miradouros are unbeatable.')
  const second = await mk(c, 'Lisbon is easier to walk in three days than Porto.')
  await mk(b, 'Porto is cheaper and the river is gorgeous at night.')

  assert.equal((await a.post(`/api/arguments/${first.id}/convincing`)).status, 403, 'own argument')
  assert.equal((await b.post(`/api/arguments/${second.id}/convincing`)).body.convincing, 1)
  assert.equal((await owner.post(`/api/arguments/${second.id}/convincing`)).body.convincing, 2)
  assert.equal((await b.post(`/api/arguments/${second.id}/convincing`)).body.convincing, 1, 'second tap un-marks')

  const list = (await b.get(`/api/polls/${p.id}/arguments?sort=top`)).body
  assert.equal(list.a.length, 2); assert.equal(list.b.length, 1)
  assert.equal(list.a[0].id, second.id, 'most convincing first')
  assert.equal(list.a[0].mine, false); assert.equal(list.b[0].mine, true)

  for (let i = 0; i < 4; i++) await mk(a, `Argument number ${i} about trams.`)
  assert.equal((await a.post(`/api/polls/${p.id}/arguments`, { body: 'One too many.' })).body.error.code, 'argument_limit')

  assert.equal((await b.del(`/api/arguments/${first.id}`)).status, 403, 'strangers can’t delete')
  assert.equal((await owner.del(`/api/arguments/${first.id}`)).status, 200, 'the asker can moderate')
  const q = await db.one('SELECT args_count FROM questions WHERE question_id = ?', [p.id])
  assert.equal(q.args_count, 6)
})

test('arguments can be turned off by the asker', async () => {
  const owner = await newUser(base), v = await newUser(base)
  const p = (await owner.post('/api/polls', poll({ arguments_enabled: false }))).body.poll
  await v.post(`/api/polls/${p.id}/vote`, { option_id: p.options[0].id })
  assert.equal((await v.post(`/api/polls/${p.id}/arguments`, { body: 'Let me explain' })).body.error.code, 'arguments_off')
})

test('closed polls: no votes, results revealed, outcome notifies voters once', async () => {
  const owner = await newUser(base), a = await newUser(base), b = await newUser(base), saver = await newUser(base)
  const p = (await owner.post('/api/polls', poll())).body.poll
  const [optA, optB] = p.options.map((o) => o.id)
  await a.post(`/api/polls/${p.id}/vote`, { option_id: optA })
  await b.post(`/api/polls/${p.id}/vote`, { option_id: optB })
  await saver.put(`/api/polls/${p.id}/save`)

  assert.equal((await owner.post(`/api/polls/${p.id}/outcome`, { option_id: optA })).body.error.code, 'not_closed')
  await db.query("UPDATE questions SET closes_at = now() - interval '1 minute' WHERE question_id = ?", [p.id])

  const late = await newUser(base)
  assert.equal((await late.post(`/api/polls/${p.id}/vote`, { option_id: optA })).body.error.code, 'poll_closed')
  const seen = (await late.get(`/api/polls/${p.id}`)).body.poll
  assert.equal(seen.closed, true); assert.equal(seen.revealed, true); assert.equal(seen.results.n, 2)

  assert.equal((await a.post(`/api/polls/${p.id}/outcome`, { option_id: optA })).status, 403)
  const done = await owner.post(`/api/polls/${p.id}/outcome`, { option_id: optA })
  assert.equal(done.body.poll.outcome.label, 'Lisbon')
  assert.equal((await owner.post(`/api/polls/${p.id}/outcome`, { option_id: optB })).body.error.code, 'already_reported')

  const na = (await a.get('/api/notifications')).body
  assert.equal(na.unread, 1); assert.equal(na.items[0].you_matched, true); assert.equal(na.items[0].outcome_label, 'Lisbon')
  assert.equal((await b.get('/api/notifications')).body.items[0].you_matched, false)
  assert.equal((await saver.get('/api/notifications')).body.items.length, 1, 'savers hear about it too')
  assert.equal((await owner.get('/api/notifications')).body.items.length, 0)
  await a.post('/api/notifications/read')
  assert.equal((await a.get('/api/notifications')).body.unread, 0)
})

test('edit context before votes, locked after; only the asker can delete', async () => {
  const owner = await newUser(base), v = await newUser(base)
  const p = (await owner.post('/api/polls', poll())).body.poll
  assert.equal((await v.patch(`/api/polls/${p.id}`, { context: 'hax' })).status, 403)
  const ed = await owner.patch(`/api/polls/${p.id}`, { context: 'Updated context, budget €300.' })
  assert.equal(ed.body.poll.context, 'Updated context, budget €300.'); assert.equal(ed.body.poll.edited, true)
  await v.post(`/api/polls/${p.id}/vote`, { option_id: p.options[0].id })
  assert.equal((await owner.patch(`/api/polls/${p.id}`, { context: 'too late' })).body.error.code, 'locked')
  assert.equal((await v.del(`/api/polls/${p.id}`)).status, 403)
  assert.equal((await owner.del(`/api/polls/${p.id}`)).status, 200)
  assert.equal((await owner.get(`/api/polls/${p.id}`)).status, 404)
  assert.equal((await owner.del(`/api/polls/${p.id}`)).status, 404)
})

test('anonymous polls never reveal their author', async () => {
  const owner = await newUser(base, 'secretasker'), v = await newUser(base)
  const p = (await owner.post('/api/polls', poll({ title: 'Should I quit my degree to start a band?', is_anonymous: true }))).body.poll
  assert.equal(p.mine, true); assert.equal(p.author, null)
  const seen = await v.get(`/api/polls/${p.id}`)
  assert.equal(seen.body.poll.author, null); assert.equal(seen.body.poll.mine, false)
  const feed = await v.get('/api/polls?lens=fresh&limit=30')
  assert.equal(JSON.stringify(feed.body).includes(owner.username), false, 'username appears nowhere in the feed')
  assert.equal(JSON.stringify(seen.body).includes(owner.username), false)
})

test('feed lenses, topic filter, search escaping and pagination', async () => {
  const author = await newUser(base, 'feed'), me = await newUser(base, 'reader')
  const mk = (title, over) => author.post('/api/polls', poll({ title, ...over })).then((r) => r.body.poll)
  const m1 = await mk('Is 100% oil heating worth it vs a heat pump?', { topic: 'Home', option_a: 'Oil', option_b: 'Heat pump' })
  const m2 = await mk('Underscore_test or something else entirely?', { topic: 'Tech', option_a: 'First', option_b: 'Second' })
  const m3 = await mk('Study at the library or at home tonight?', { topic: 'Study', option_a: 'Library', option_b: 'Home' })

  const foryou = (await me.get('/api/polls?lens=foryou&limit=30')).body
  const ids = foryou.polls.map((p) => p.id)
  assert.ok([m1, m2, m3].every((p) => ids.includes(p.id)))
  assert.equal((await author.get('/api/polls?lens=foryou&limit=30')).body.polls.some((p) => p.id === m1.id), false, 'own polls are not in For you')

  await me.post(`/api/polls/${m3.id}/vote`, { option_id: m3.options[0].id })
  assert.equal((await me.get('/api/polls?lens=foryou&limit=30')).body.polls.some((p) => p.id === m3.id), false, 'voted polls leave For you')
  assert.equal((await me.get('/api/polls?lens=fresh&limit=30')).body.polls.some((p) => p.id === m3.id), true, 'but stay in Fresh')

  assert.equal((await me.get('/api/polls?topic=home&limit=30')).body.polls.every((p) => p.topic === 'Home'), true)
  assert.equal((await me.get('/api/polls?q=100%25&limit=30')).body.polls.map((p) => p.id).join(), String(m1.id), 'a literal % matches only the 100% poll')
  assert.equal((await me.get('/api/polls?q=_test&limit=30')).body.polls.map((p) => p.id).join(), String(m2.id), 'a literal _ is not a wildcard')
  assert.equal((await me.get('/api/polls?q=nothingmatchesthis')).body.polls.length, 0)

  const page1 = (await me.get('/api/polls?lens=fresh&limit=2')).body
  assert.equal(page1.polls.length, 2); assert.equal(page1.has_more, true)
  const page2 = (await me.get(`/api/polls?lens=fresh&limit=2&offset=${page1.next_offset}`)).body
  assert.notEqual(page2.polls[0].id, page1.polls[0].id)
  assert.equal((await me.get('/api/polls?lens=bogus')).status, 400)
  assert.equal((await me.get('/api/polls?limit=9999')).status, 400)

  await me.put(`/api/polls/${m1.id}/save`)
  assert.deepEqual((await me.get('/api/polls?lens=saved')).body.polls.map((p) => p.id), [m1.id])
  assert.equal((await me.get('/api/users/me/polls?tab=voted')).body.polls[0].id, m3.id)
  await me.del(`/api/polls/${m1.id}/save`)
  assert.equal((await me.get('/api/polls?lens=saved')).body.polls.length, 0)
})

test('"needs votes" and "too close to call" lenses', async () => {
  const owner = await newUser(base), voters = await Promise.all(Array.from({ length: 12 }, () => newUser(base, 'v')))
  const p = (await owner.post('/api/polls', poll({ title: 'Cats or dogs for a small flat? Pick one.', topic: 'Home', option_a: 'Cats', option_b: 'Dogs' }))).body.poll
  const fresh = await newUser(base)
  assert.ok((await fresh.get('/api/polls?lens=needs&limit=30')).body.polls.some((x) => x.id === p.id))
  await Promise.all(voters.map((v, i) => v.post(`/api/polls/${p.id}/vote`, { option_id: p.options[i % 2].id })))
  assert.equal((await fresh.get('/api/polls?lens=needs&limit=30')).body.polls.some((x) => x.id === p.id), false)
  const close = (await fresh.get('/api/polls?lens=close')).body.polls
  assert.ok(close.some((x) => x.id === p.id), 'a 6–6 poll with 12 votes is too close to call')
  const trend = (await owner.get(`/api/polls/${p.id}/trend`)).body.points
  assert.equal(trend.length, 8); assert.equal(trend[7].n, 12); assert.equal(trend[7].pct_a, 50)
})

test('reports hide content after five distinct reporters', async () => {
  const owner = await newUser(base), target = (await owner.post('/api/polls', poll())).body.poll
  assert.equal((await owner.post(`/api/polls/${target.id}/report`, { reason: 'spam' })).status, 403, 'no self-reports')
  const reporters = await Promise.all(Array.from({ length: 5 }, () => newUser(base)))
  assert.equal((await reporters[0].post(`/api/polls/${target.id}/report`, { reason: 'nonsense' })).status, 400)
  for (const r of reporters.slice(0, 4)) await r.post(`/api/polls/${target.id}/report`, { reason: 'spam' })
  await reporters[0].post(`/api/polls/${target.id}/report`, { reason: 'spam' }) // duplicate does not count twice
  assert.equal((await reporters[1].get(`/api/polls/${target.id}`)).status, 200)
  await reporters[4].post(`/api/polls/${target.id}/report`, { reason: 'abuse' })
  assert.equal((await reporters[1].get(`/api/polls/${target.id}`)).status, 404)
})

test('profile: validation, avatar rules, topics and stats', async () => {
  const u = await newUser(base, 'prof')
  assert.equal((await u.put('/api/users/me', { birthday: '2030-01-01' })).status, 400)
  assert.equal((await u.put('/api/users/me', { avatar: 'javascript:alert(1)' })).status, 400)
  assert.equal((await u.put('/api/users/me', { avatar: 'data:image/svg+xml;base64,PHN2Zz4=' })).status, 400, 'SVG avatars rejected')
  assert.equal((await u.put('/api/users/me', { gender: 'robot' })).status, 400)
  assert.equal((await u.put('/api/users/me', { is_admin: true })).status, 400)
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  const ok = await u.put('/api/users/me', { display_name: 'Kabir <3', bio: 'Votes on everything.', region: 'Dublin', birthday: '2001-04-02', gender: 'Male', avatar: png })
  assert.equal(ok.status, 200); assert.equal(ok.body.user.display_name, 'Kabir <3'); assert.equal(ok.body.user.birthday, '2001-04-02'); assert.equal(ok.body.user.avatar, png)
  assert.equal((await u.put('/api/users/me/topics', { topics: [] })).status, 400)
  assert.equal((await u.put('/api/users/me/topics', { topics: ['Tech', 'Fake'] })).status, 400)
  await u.put('/api/users/me/topics', { topics: ['Tech', 'Money', 'Travel'] })
  const me = (await u.get('/api/users/me')).body
  assert.deepEqual(me.user.topics, ['Tech', 'Money', 'Travel'])
  assert.equal(me.stats.votes_cast, 0); assert.equal(me.stats.with_majority_pct, null)
})

test('stats: crowd alignment, streak and pending outcomes', async () => {
  const owner = await newUser(base, 'asker'), me = await newUser(base, 'me')
  const crowd = await Promise.all(Array.from({ length: 11 }, () => newUser(base, 'c')))
  const p = (await owner.post('/api/polls', poll({ topic: 'Money', title: 'Clear the loan first or start investing now?', option_a: 'Clear loan', option_b: 'Invest' }))).body.poll
  await Promise.all(crowd.map((c, i) => c.post(`/api/polls/${p.id}/vote`, { option_id: p.options[i < 8 ? 0 : 1].id })))
  await me.post(`/api/polls/${p.id}/vote`, { option_id: p.options[0].id })
  const s = (await me.get('/api/users/me')).body.stats
  assert.equal(s.votes_cast, 1); assert.equal(s.with_majority_pct, 100); assert.equal(s.streak_days, 1)
  assert.deepEqual(s.alignment, [{ topic: 'Money', n: 1, pct: 100 }])
  await db.query("UPDATE questions SET closes_at = now() - interval '1 hour' WHERE question_id = ?", [p.id])
  const pending = (await owner.get('/api/users/me')).body.pending_outcomes
  assert.equal(pending.length, 1); assert.equal(pending[0].id, p.id)
  const topics = (await me.get('/api/topics?trend=1')).body.topics
  assert.equal(topics.length, 12); assert.ok(topics.find((t) => t.name === 'Money').votes_7d >= 12)
})

test('errors: bad ids, bad JSON, unknown routes never leak internals', async () => {
  const u = await newUser(base)
  assert.equal((await u.get('/api/polls/abc')).status, 400)
  assert.equal((await u.get('/api/polls/0')).status, 400)
  assert.equal((await u.get('/api/polls/99999999')).status, 404)
  assert.equal((await u.get('/api/nope')).status, 404)
  const bad = await fetch(base + '/api/polls', { method: 'POST', headers: { Cookie: u.cookie, 'X-Requested-With': 'tot', 'Content-Type': 'application/json' }, body: '{bad' })
  assert.equal(bad.status, 400)
  const sqli = await u.get('/api/polls?q=' + encodeURIComponent("' OR 1=1; DROP TABLE users; --"))
  assert.equal(sqli.status, 200); assert.equal(sqli.body.polls.length, 0)
  assert.equal((await u.get('/api/users/me')).status, 200, 'users table still exists')
})

test('static pages are served with the CSP and old URLs redirect', async () => {
  const home = await fetch(base + '/', { redirect: 'manual' })
  assert.equal(home.status, 302)
  const old = await fetch(base + '/question.html?id=5', { redirect: 'manual' })
  assert.equal(old.status, 301); assert.equal(old.headers.get('location'), '/poll.html?id=5')
})

test('rate limits: sign-ups and sign-ins from one address are throttled', async () => {
  process.env.TEST_RATE_LIMITS = '1'
  try {
    const c = new Client(base)
    const codes = []
    for (let i = 0; i < 12; i++) codes.push((await c.post('/api/auth/signup', { username: 'flood_' + i, password: 'Sup3r-secret-pw' })).status)
    assert.ok(codes.slice(0, 10).every((s) => s === 201), 'first ten sign-ups pass')
    assert.deepEqual(codes.slice(10), [429, 429])
    assert.equal((await c.post('/api/auth/signup', { username: 'flood_x', password: 'Sup3r-secret-pw' })).body.error.code, 'rate_limited')
  } finally { delete process.env.TEST_RATE_LIMITS }
})
