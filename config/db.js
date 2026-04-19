/**
 * File: db.js
 * Purpose: Configuration mapping for connection pooling to the primary MySQL Database
 */

require('dotenv').config()
const mysql = require('mysql2/promise')

const fallbackPass = Buffer.from('QVZOU18wcTNJY2VLUm96eGRublRvczYy', 'base64').toString('utf8');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'thisorthat2026-thisorthat2026.f.aivencloud.com',
  port: process.env.DB_PORT || 23286,
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD || fallbackPass,
  database: process.env.DB_NAME || 'defaultdb',
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
})

// test the connection on startup
pool.getConnection()
  .then(conn => {
    console.log('db connection verified')
    conn.release()
  })
  .catch(err => {
    console.error('db connection failed:', err.message)
  })

console.log('db pool ready')
module.exports = pool
 
 
 