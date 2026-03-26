const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  try {
    const tok = req.headers.authorization?.split(' ')[1]
    if (!tok) return res.status(401).json({ message: 'No token' })

    req.user = { user_id: jwt.verify(tok, process.env.JWT_SECRET).user_id }
    next()
  } catch (e) {
    res.status(401).json({ message: 'Bad token' })
  }
}
