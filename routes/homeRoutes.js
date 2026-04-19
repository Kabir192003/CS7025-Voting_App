/**
 * File: homeRoutes.js
 * Purpose: Routing layer for rendering personalized and trending home feeds
 */

const router = require('express').Router()
const checkAuth = require('../middleware/authMiddleware')
const home = require('../controllers/homeController')

router.use(checkAuth)
router.get(['/', '/personalised'], home.getPersonalisedHome)
router.get('/trending', home.getTrendingFeed)
router.get('/unanswered', home.getUnansweredFeed)

module.exports = router
 
 