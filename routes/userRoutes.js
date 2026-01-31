const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { savePreferences, getUserProfile, getUserQuestions, getUserAnswers } = require('../controllers/userController');

// All routes here are protected
router.use(authMiddleware);

router.get('/me', getUserProfile);
router.get('/me/questions', getUserQuestions);
router.get('/me/answers', getUserAnswers);
router.post('/preferences', savePreferences);

module.exports = router;

