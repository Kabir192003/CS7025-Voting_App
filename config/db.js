/**
 * Postgres pool (Supabase or any Postgres). SQL is written with `?` placeholders
 * and converted to $1, $2 ... so dynamic queries stay easy to assemble.
 */
const { Pool, types } = require('pg')
const env = require('./env')

types.setTypeParser(20, (v) => parseInt(v, 10))   // bigint (COUNT, SUM) -> number
types.setTypeParser(1700, (v) => parseFloat(v))   // numeric -> number
types.setTypeParser(1082, (v) => v)               // date -> 'YYYY-MM-DD' string

const toPg = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`) }

const pool = new Pool({ ...env.db, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 })
pool.on('error', (err) => console.error(JSON.stringify({ level: 'error', message: 'idle client error', error: err.message })))

const wrap = (client) => ({
  /** @returns {Promise<{rows: any[], rowCount: number}>} */
  query: (sql, params = []) => client.query(toPg(sql), params),
  /** First row or undefined. */
  one: async (sql, params = []) => (await client.query(toPg(sql), params)).rows[0]
})

const db = {
  ...wrap(pool),
  /** Run `fn(tx)` inside a transaction; rolls back on any throw. */
  async tx(fn) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await fn(wrap(client))
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      throw err
    } finally {
      client.release()
    }
  },
  /** Raw pg client for the migrator (needs session-level advisory locks). */
  connect: () => pool.connect(),
  end: () => pool.end()
}

module.exports = db
