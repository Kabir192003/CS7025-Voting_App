/**
 * File: authRoutes.js
 * Purpose: Routing layer for user authentication (Login/Signup/Logout)
 */

const router = require('express').Router()
const auth = require('../controllers/authController')

router.post('/signup', auth.signup)
router.post('/login', auth.login)

module.exports = router
 