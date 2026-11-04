/**
 * Forward-only SQL migrations from supabase/migrations/*.sql, applied in filename
 * order, each inside a transaction. The same files work with `supabase db push`
 * and the Supabase SQL editor. An advisory lock stops two instances migrating at once.
 */
const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, '..', 'supabase', 'migrations')
const LOCK_KEY = 724001

async function migrate(db, log = console.log) {
  const client = await db.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY])
    await client.query('CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
    await client.query('ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY')
    const applied = new Set((await client.query('SELECT name FROM public.schema_migrations')).rows.map((r) => r.name))
    let ran = 0
    for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()) {
      if (applied.has(file)) continue
      log(`migrate: applying ${file}`)
      try {
        await client.query('BEGIN')
        await client.query(fs.readFileSync(path.join(DIR, file), 'utf8'))
        await client.query('INSERT INTO public.schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        throw new Error(`${file}: ${err.message}`)
      }
      ran++
    }
    log(ran ? `migrate: applied ${ran} migration(s)` : 'migrate: database is up to date')
    return ran
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {})
    client.release()
  }
}

module.exports = { migrate }
