/**
 * File: preferenceRoutes.js
 * Purpose: Routing layer for managing user category preferences
 */

const router = require('express').Router()
const checkAuth = require('../middleware/authMiddleware')
const { savePreferences } = require('../controllers/preferenceController')

router.post('/', checkAuth, savePreferences)

module.exports = router
 