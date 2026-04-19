/**
 * File: userRoutes.js
 * Purpose: Routing layer for user profiles and interaction history
 */

const router = require('express').Router()
const checkAuth = require('../middleware/authMiddleware')
const users = require('../controllers/userController')

router.use(checkAuth)
router.get('/me', users.getUserProfile)
router.put('/me', users.updateUserProfile)
router.get('/me/questions', users.getUserQuestions)
router.get('/me/answers', users.getUserAnswers)
router.post('/preferences', users.savePreferences)

module.exports = router
 