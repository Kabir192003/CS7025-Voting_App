const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { setup, resetDb } = require('./helpers')
const { db, root } = setup('thisorthat_schema')
const { migrate } = require(root + '/lib/migrator')

before(async () => { await resetDb(db) })
after(async () => { await db.end() })

test('migrations apply once and are idempotent', async () => {
  assert.equal(await migrate(db, () => {}), 1)
  assert.equal(await migrate(db, () => {}), 0)
  assert.equal((await db.query('SELECT 1 FROM categories')).rowCount, 12, 'twelve topics are seeded by the schema')
})

test('every table has row-level security on and no policies (Supabase Data API is locked out)', async () => {
  const { rows } = await db.query("SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'")
  assert.ok(rows.length >= 13)
  assert.deepEqual(rows.filter((r) => !r.relrowsecurity).map((r) => r.relname), [], 'tables without RLS')
  const policies = await db.query("SELECT 1 FROM pg_policies WHERE schemaname = 'public'")
  assert.equal(policies.rowCount, 0)
})

test('the database itself refuses a vote for an option from another poll', async () => {
  const u = await db.one("INSERT INTO users (username, password_hash) VALUES ('schema_user', 'x') RETURNING user_id")
  const voter = await db.one("INSERT INTO users (username, password_hash) VALUES ('schema_voter', 'x') RETURNING user_id")
  const mk = async (title) => {
    const q = await db.one('INSERT INTO questions (user_id, title) VALUES (?, ?) RETURNING question_id', [u.user_id, title])
    const { rows } = await db.query('INSERT INTO options (question_id, option_text, position) VALUES (?, ?, 0), (?, ?, 1) RETURNING option_id', [q.question_id, 'A', q.question_id, 'B'])
    return { q: q.question_id, a: rows[0].option_id }
  }
  const one = await mk('First decision for the schema test'), two = await mk('Second decision for the schema test')
  await assert.rejects(db.query('INSERT INTO votes (question_id, option_id, user_id) VALUES (?, ?, ?)', [one.q, two.a, voter.user_id]), /foreign key/)
  await assert.rejects(db.query('INSERT INTO arguments (question_id, option_id, user_id, body) VALUES (?, ?, ?, ?)', [one.q, two.a, voter.user_id, 'wrong poll']), /foreign key/)
  await db.query('INSERT INTO votes (question_id, option_id, user_id) VALUES (?, ?, ?)', [one.q, one.a, voter.user_id])
  await assert.rejects(db.query('INSERT INTO votes (question_id, option_id, user_id) VALUES (?, ?, ?)', [one.q, one.a, voter.user_id]), /unique/, 'one vote per user per poll')
  await assert.rejects(db.query('INSERT INTO options (question_id, option_text, position) VALUES (?, ?, 2)', [one.q, 'C']), /check/, 'exactly two options')
  await assert.rejects(db.query("INSERT INTO users (username, password_hash) VALUES ('SCHEMA_USER', 'x')"), /unique/, 'usernames are case-insensitive')
  await assert.rejects(db.query("INSERT INTO users (username, password_hash) VALUES ('<script>', 'x')"), /check/, 'username charset enforced')
})
