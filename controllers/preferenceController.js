const db = require('../config/db')

exports.savePreferences = async (req, res) => {
  try {
    const { categories } = req.body
    if (!Array.isArray(categories))
      return res.status(400).json({ message: 'categories must be an array' })

    await db.query('DELETE FROM user_preferences WHERE user_id = ?', [req.user.user_id])

    if (categories.length > 0) {
      const vals = categories.map(c => [req.user.user_id, c])
      await db.query('INSERT INTO user_preferences (user_id, category_id) VALUES ?', [vals])
    }

    res.json({ message: 'Preferences saved successfully' })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
}
