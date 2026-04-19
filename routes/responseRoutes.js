/**
 * File: responseRoutes.js
 * Purpose: Routing layer for handling user votes and comments on questions
 */

const router = require('express').Router()
const checkAuth = require('../middleware/authMiddleware')
const responses = require('../controllers/responseController')

router.use(checkAuth)
router.post('/', responses.submitResponse)
router.get('/:questionId', responses.getResponses)

module.exports = router
