const db = require('../config/db')

// same helper as home controller - pulls in options/categories/votes for questions
async function fillInDetails(questions, userId) {
  if (!questions.length) return questions
  const ids = questions.map(q => q.question_id)

  const [opts] = await db.query(
    'SELECT o.option_id, o.question_id, o.option_text, (SELECT COUNT(*) FROM responses WHERE option_id = o.option_id) as votes FROM options o WHERE o.question_id IN (?)',
    [ids]
  )
  const [cats] = await db.query(
    'SELECT qc.question_id, c.name FROM question_categories qc JOIN categories c ON qc.category_id = c.category_id WHERE qc.question_id IN (?)',
    [ids]
  )

  let voted = {}
  if (userId) {
    const [rows] = await db.query('SELECT question_id, option_id FROM responses WHERE user_id = ? AND question_id IN (?)', [userId, ids])
    rows.forEach(r => voted[r.question_id] = r.option_id)
  }

  return questions.map(q => {
    q.options = opts.filter(o => o.question_id === q.question_id)
    q.categories = cats.filter(c => c.question_id === q.question_id).map(c => c.name)
    q.user_voted_option_id = voted[q.question_id] || null
    return q
  })
}

exports.getUserProfile = async (req, res) => {
  try {
    const [[user]] = await db.query(
      `SELECT user_id, username, email, display_name as displayName, avatar_data as avatarData,
            gender, birthday, region, bio, created_at,
           (SELECT COUNT(*) FROM questions WHERE user_id = users.user_id) as questionsPosted,
           (SELECT COUNT(*) FROM responses WHERE user_id = users.user_id) as answersContributed,
           (SELECT COUNT(*) FROM responses r JOIN questions q ON r.question_id = q.question_id WHERE q.user_id = users.user_id) as votesReceived
          FROM users WHERE user_id = ?`,
      [req.user.user_id]
    )
    if (!user) return res.status(404).json({ message: 'User not found' })

    const [prefs] = await db.query(
      'SELECT c.category_id, c.name FROM user_preferences up JOIN categories c ON up.category_id = c.category_id WHERE up.user_id = ?',
      [req.user.user_id]
    )
    res.json({ ...user, interests: prefs.map(p => p.name) })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.getUserQuestions = async (req, res) => {
  try {
    let [questions] = await db.query(`
      SELECT q.question_id, q.title, q.description, q.created_at, q.is_anonymous, SUBSTRING_INDEX(u.display_name, ' ', 1) AS username,
        COUNT(r.response_id) as interaction_count
      FROM questions q JOIN users u ON q.user_id = u.user_id
       LEFT JOIN responses r ON q.question_id = r.question_id
      WHERE q.user_id = ? GROUP BY q.question_id ORDER BY q.created_at DESC
    `, [req.user.user_id])

    questions.forEach(q => { if (q.is_anonymous) q.username = 'Anonymous' })
    questions = await fillInDetails(questions, req.user.user_id)
    res.json(questions)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.savePreferences = async (req, res) => {
  const conn = await db.getConnection()
  try {
    const { categories } = req.body
    if (!Array.isArray(categories) || !categories.length)
      return res.status(400).json({ message: 'No preferences' })

    await conn.beginTransaction()
    await conn.query('DELETE FROM user_preferences WHERE user_id = ?', [req.user.user_id])
    await conn.query('INSERT INTO user_preferences (user_id, category_id) VALUES ?',
      [categories.map(c => [req.user.user_id, c])])
    await conn.commit()

    res.json({ message: 'Saved' })
  } catch (e) {
    await conn.rollback()
    res.status(500).json({ message: 'Error' })
  } finally {
    conn.release()
  }
}

exports.getUserAnswers = async (req, res) => {
  try {
    let [questions] = await db.query(`
          SELECT q.question_id, q.title, q.description, q.created_at, q.is_anonymous, SUBSTRING_INDEX(u.display_name, ' ', 1) AS username,
            (SELECT COUNT(*) FROM responses WHERE question_id = q.question_id) as interaction_count,
             MAX(r.created_at) as last_interaction
          FROM responses r JOIN questions q ON r.question_id = q.question_id
          JOIN users u ON q.user_id = u.user_id
          WHERE r.user_id = ? GROUP BY q.question_id ORDER BY last_interaction DESC
        `, [req.user.user_id])

    questions.forEach(q => { if (q.is_anonymous) q.username = 'Anonymous' })
    questions = await fillInDetails(questions, req.user.user_id)
    res.json(questions)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.updateUserProfile = async (req, res) => {
  try {
    const { displayName, avatarData, gender, birthday, region, bio, interests } = req.body

    await db.query(
      'UPDATE users SET display_name=?, avatar_data=?, gender=?, birthday=?, region=?, bio=? WHERE user_id=?',
      [displayName, avatarData, gender, birthday, region, bio, req.user.user_id]
    )

    // update interests if provided
    if (interests && Array.isArray(interests)) {
      const conn = await db.getConnection()
      try {
        await conn.beginTransaction()
        await conn.query('DELETE FROM user_preferences WHERE user_id = ?', [req.user.user_id])
        if (interests.length > 0) {
          const [found] = await conn.query('SELECT category_id, name FROM categories WHERE name IN (?)', [interests])
          if (found.length > 0) {
            const rows = found.map(c => [req.user.user_id, c.category_id])
            await conn.query('INSERT INTO user_preferences (user_id, category_id) VALUES ?', [rows])
          }
        }
        await conn.commit()
      } catch (err) {
        await conn.rollback()
        console.error('interests update failed', err)
      } finally {
        conn.release()
      }
    }

    res.json({ message: 'Profile updated successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}
