/** Apply pending migrations: npm run migrate */
const db = require('../config/db')
const { migrate } = require('../lib/migrator')

migrate(db)
  .then(() => db.end())
  .catch((err) => { console.error('migrate failed:', err.message); process.exit(1) })
