const express = require('express');
const router = express.Router();
const { getPersonalisedHome, getTrendingFeed, getUnansweredFeed } = require('../controllers/homeController');
const authenticateToken = require('../middleware/authMiddleware');


router.get('/', authenticateToken, getPersonalisedHome);
router.get('/personalised', authenticateToken, getPersonalisedHome);
router.get('/trending', authenticateToken, getTrendingFeed);
router.get('/unanswered', authenticateToken, getUnansweredFeed);

module.exports = router;
