const router = require('express').Router()
const requireAuth = require('../middleware/auth')
const { authLimiter, signupLimiter, voteLimiter, writeLimiter } = require('../middleware/security')
const auth = require('../controllers/authController')
const polls = require('../controllers/pollController')
const args = require('../controllers/argumentController')
const users = require('../controllers/userController')
const misc = require('../controllers/miscController')

router.get('/health', misc.health)

// auth
router.post('/auth/signup', signupLimiter, auth.signup)
router.post('/auth/login', authLimiter, auth.login)
router.post('/auth/logout', auth.logout)

// everything below needs a session
router.use(requireAuth)
router.post('/auth/logout-all', auth.logoutAll)
router.post('/auth/password', authLimiter, auth.changePassword)

router.get('/topics', misc.topics)
router.get('/notifications', misc.notifications)
router.post('/notifications/read', misc.readNotifications)

router.get('/users/me', users.me)
router.put('/users/me', writeLimiter, users.update)
router.put('/users/me/topics', users.setTopics)
router.get('/users/me/polls', users.polls)

router.get('/polls', polls.list)
router.post('/polls', writeLimiter, polls.create)
router.get('/polls/:id', polls.get)
router.patch('/polls/:id', writeLimiter, polls.edit)
router.delete('/polls/:id', polls.remove)
router.post('/polls/:id/vote', voteLimiter, polls.vote)
router.delete('/polls/:id/vote', voteLimiter, polls.unvote)
router.post('/polls/:id/peek', voteLimiter, polls.peek)
router.put('/polls/:id/save', polls.save)
router.delete('/polls/:id/save', polls.unsave)
router.post('/polls/:id/outcome', writeLimiter, polls.outcome)
router.post('/polls/:id/report', writeLimiter, polls.report)
router.get('/polls/:id/trend', polls.trend)
router.get('/polls/:id/arguments', args.list)
router.post('/polls/:id/arguments', writeLimiter, args.create)

router.delete('/arguments/:id', args.remove)
router.post('/arguments/:id/convincing', voteLimiter, args.toggleConvincing)
router.post('/arguments/:id/report', writeLimiter, args.report)

module.exports = router
