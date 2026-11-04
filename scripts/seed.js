/**
 * Seed demo content for development: demo users, curated decisions across the
 * twelve topics, votes spread over each poll's lifetime, and a few arguments.
 *   npm run seed            add demo content (skips if already present)
 *   npm run seed -- --reset remove previous demo content first
 * Refuses to run when NODE_ENV=production unless --force is passed.
 */
const bcrypt = require('bcrypt')
const env = require('../config/env')
const db = require('../config/db')
const { migrate } = require('../lib/migrator')
const questions = require('../data/questions')

const args = new Set(process.argv.slice(2))
const PASSWORD = process.env.SEED_PASSWORD || 'Demo-pass-1234'
const NAMES = ['ada', 'niamh', 'cian', 'sorcha', 'ruairi', 'aoife', 'maeve', 'tadhg', 'ciara', 'fionn', 'orla', 'eoin', 'grainne', 'darragh', 'saoirse', 'conor', 'roisin', 'oisin', 'aisling', 'padraig', 'emer', 'declan', 'nuala', 'colm', 'ines', 'luca', 'mei', 'arjun', 'zoe', 'tomas']
const ARGUMENT_FILLER = ['Fair point on cost, but the daily convenience wins for me.', 'I tried the other way for a year and went back.', 'Depends on your budget, but at that price this is the safer bet.']

const rand = (n) => Math.floor(Math.random() * n)
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1])
const pick = (a) => a[rand(a.length)]

async function main() {
  if (env.isProd && !args.has('--force')) throw new Error('Refusing to seed with NODE_ENV=production. Pass --force if you are sure.')
  await migrate(db, () => {})

  if (args.has('--reset')) {
    const r = await db.query("DELETE FROM users WHERE username LIKE 'demo\\_%'")
    console.log(`removed ${r.rowCount} demo users and everything they made`)
  }
  const existing = await db.one("SELECT COUNT(*) AS n FROM users WHERE username LIKE 'demo\\_%'")
  if (existing.n) { console.log('demo content already present (use --reset to rebuild)'); return }

  const hash = await bcrypt.hash(PASSWORD, env.bcryptRounds)
  const userIds = []
  for (const n of NAMES) {
    const r = await db.one('INSERT INTO users (username, password_hash, display_name, region) VALUES (?, ?, ?, ?) RETURNING user_id', [`demo_${n}`, hash, n[0].toUpperCase() + n.slice(1), pick(['Dublin', 'Cork', 'Galway', 'Limerick', 'Belfast'])])
    userIds.push(r.user_id)
  }
  const { rows: cats } = await db.query('SELECT category_id, name FROM categories')
  const catId = Object.fromEntries(cats.map((c) => [c.name, c.category_id]))

  let polls = 0, votes = 0, argumentsMade = 0
  const durations = [6, 24, 72, 168]
  for (const [topic, list] of Object.entries(questions)) {
    for (const [title, context, a, b, shareA, argText] of list) {
      const ageHours = 1 + rand(5 * 24)
      const duration = pick(durations)
      const author = pick(userIds)
      const createdAt = new Date(Date.now() - ageHours * 3600 * 1000)
      let closesAt = new Date(createdAt.getTime() + duration * 3600 * 1000)
      // most demo decisions should still be open so the feed has something to vote on
      if (closesAt.getTime() < Date.now() && Math.random() < 0.85) closesAt = new Date(Date.now() + (6 + rand(114)) * 3600 * 1000)
      const q = await db.one(
        `INSERT INTO questions (user_id, title, description, is_anonymous, comments_enabled, hide_results, category_id, closes_at, created_at, status)
         VALUES (?, ?, ?, ?, true, true, ?, ?, ?, 'open') RETURNING question_id`, [author, title, context, Math.random() < 0.2, catId[topic], closesAt, createdAt])
      const { rows: opts } = await db.query('INSERT INTO options (question_id, option_text, position) VALUES (?, ?, 0), (?, ?, 1) RETURNING option_id, position', [q.question_id, a, q.question_id, b])
      const optA = opts.find((o) => o.position === 0).option_id, optB = opts.find((o) => o.position === 1).option_id

      const voters = shuffle(userIds.filter((u) => u !== author)).slice(0, 4 + rand(userIds.length - 4))
      const end = Math.min(Date.now(), closesAt.getTime())
      const sideOf = {}
      for (const u of voters) {
        const side = Math.random() * 100 < shareA ? 'a' : 'b'
        sideOf[u] = side
        const at = new Date(createdAt.getTime() + Math.random() * (end - createdAt.getTime()))
        await db.query('INSERT INTO votes (question_id, option_id, user_id, created_at) VALUES (?, ?, ?, ?)', [q.question_id, side === 'a' ? optA : optB, u, at])
        votes++
      }
      const makers = voters.slice(0, Math.min(voters.length, 2 + rand(3)))
      for (const u of makers) {
        const text = argText ? argText[sideOf[u] === 'a' ? 0 : 1] : pick(ARGUMENT_FILLER)
        await db.query('INSERT INTO arguments (question_id, option_id, user_id, body, convincing_count, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [q.question_id, sideOf[u] === 'a' ? optA : optB, u, text, rand(12), new Date(createdAt.getTime() + Math.random() * (end - createdAt.getTime()))])
        argumentsMade++
      }
      polls++
    }
  }
  await db.query('UPDATE options o SET votes_count = (SELECT COUNT(*) FROM votes v WHERE v.option_id = o.option_id)')
  await db.query('UPDATE questions q SET votes_total = (SELECT COUNT(*) FROM votes v WHERE v.question_id = q.question_id), args_count = (SELECT COUNT(*) FROM arguments a WHERE a.question_id = q.question_id)')
  console.log(`seeded ${polls} decisions, ${votes} votes, ${argumentsMade} arguments, ${NAMES.length} demo users`)
  console.log(`sign in as demo_ada / ${PASSWORD}`)
}

main().then(() => db.end()).catch((e) => { console.error('seed failed:', e.message); process.exit(1) })
