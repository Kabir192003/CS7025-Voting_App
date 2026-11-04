/** Process entry point: boot checks, optional migrations, graceful shutdown. */
const env = require('./config/env')
const db = require('./config/db')
const createApp = require('./app')
const { migrate } = require('./lib/migrator')

async function main() {
  await db.query('SELECT 1') // fail fast if the database is unreachable or misconfigured
  if (env.autoMigrate) await migrate(db)

  const server = createApp().listen(env.port, () => console.log(JSON.stringify({ level: 'info', message: `listening on ${env.port}` })))
  server.requestTimeout = 15000
  server.headersTimeout = 20000

  const shutdown = (signal) => {
    console.log(JSON.stringify({ level: 'info', message: `${signal} received, shutting down` }))
    server.close(async () => { await db.end().catch(() => {}); process.exit(0) })
    setTimeout(() => process.exit(1), 10000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

// Unknown state is not safe to keep serving from: log and exit, the platform restarts us.
process.on('unhandledRejection', (err) => { console.error(JSON.stringify({ level: 'fatal', message: 'unhandledRejection', error: String(err?.stack || err) })); process.exit(1) })
process.on('uncaughtException', (err) => { console.error(JSON.stringify({ level: 'fatal', message: 'uncaughtException', error: String(err?.stack || err) })); process.exit(1) })

main().catch((err) => { console.error('Failed to start:', err.message); process.exit(1) })
