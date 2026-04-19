/**
 * File: questionRoutes.js
 * Purpose: Routing layer for question creation and retrieval
 */

const router = require('express').Router()
const checkAuth = require('../middleware/authMiddleware')
const questions = require('../controllers/questionController')

router.use(checkAuth)
router.post('/', questions.createQuestion)
router.get('/:id', questions.getQuestionById)

module.exports = router
 