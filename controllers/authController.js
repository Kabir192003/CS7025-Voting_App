/**
 * File: authController.js
 * Purpose: Controller managing JWT authentication, registration, and logic
 */

const db = require('../config/db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

function makeToken(id) {
  const fallbackSecret = 'supersecretassignmentkey';
  return jwt.sign({ user_id: id }, process.env.JWT_SECRET || fallbackSecret, { expiresIn: '7d' })
}

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' })

    const hashed = await bcrypt.hash(password, 10)
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email || null, hashed]
    )

    res.status(201).json({ message: 'Signup successful', token: makeToken(result.insertId) })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'User already exists' })
    res.status(500).json({ message: 'Server error' })
  }
}

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' })

    const [[user]] = await db.query('SELECT * FROM users WHERE username = ?', [username])
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    res.json({ message: 'Login successful', token: makeToken(user.user_id) })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
}
 
