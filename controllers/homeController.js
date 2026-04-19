/**
 * File: homeController.js
 * Purpose: Controller managing dynamic feed generation based on user preferences and trends
 */
const db = require('../config/db')

// grabs options, categories, and user votes for a list of questions
async function fillInDetails(questions, userId) {
  if (!questions.length) return questions
  const ids = questions.map(q => q.question_id)

  const [opts] = await db.query(`
    SELECT o.option_id, o.question_id, o.option_text,
      (SELECT COUNT(*) FROM responses WHERE option_id = o.option_id) as votes
    FROM options o WHERE o.question_id IN (?)`, [ids])

  const [cats] = await db.query(`
    SELECT qc.question_id, c.name FROM question_categories qc
    JOIN categories c ON qc.category_id = c.category_id
     WHERE qc.question_id IN (?)`, [ids])

  let voted = {}
  if (userId) {
    const [rows] = await db.query(
      'SELECT question_id, option_id FROM responses WHERE user_id = ? AND question_id IN (?)',
      [userId, ids]
    )
    rows.forEach(r => voted[r.question_id] = r.option_id)
  }

  return questions.map(q => {
    q.options = opts.filter(o => o.question_id === q.question_id)
    q.categories = cats.filter(c => c.question_id === q.question_id).map(c => c.name)
    q.user_voted_option_id = voted[q.question_id] || null
    return q
  })
}

exports.getPersonalisedHome = async (req, res) => {
  try {
    const [prefs] = await db.query(
      'SELECT category_id FROM user_preferences WHERE user_id = ?', [req.user.user_id]
    )
    const catIds = prefs.map(p => p.category_id)

    let sql
    if (catIds.length === 0) {
      sql = `SELECT q.question_id, q.title, q.description, q.created_at, q.is_anonymous,
        COALESCE(SUBSTRING_INDEX(u.display_name, ' ', 1), u.username) AS username,
        (SELECT COUNT(*) FROM responses WHERE question_id = q.question_id) as interaction_count
        FROM questions q JOIN users u ON q.user_id = u.user_id
        ORDER BY q.created_at DESC LIMIT 20`
    } else {
      sql = `SELECT DISTINCT q.question_id, q.title, q.description, q.created_at, q.is_anonymous,
        COALESCE(SUBSTRING_INDEX(u.display_name, ' ', 1), u.username) AS username,
        (SELECT COUNT(*) FROM responses WHERE question_id = q.question_id) as interaction_count
        FROM questions q JOIN question_categories qc ON q.question_id = qc.question_id
        JOIN users u ON q.user_id = u.user_id
        WHERE qc.category_id IN (?) ORDER BY q.created_at DESC LIMIT 50`
    }

    let [questions] = await db.query(sql, catIds.length ? [catIds] : [])
    questions.forEach(q => { if (q.is_anonymous) q.username = 'Anonymous' })
    questions = await fillInDetails(questions, req.user.user_id)

    res.json({
      message: catIds.length ? 'Personalised feed' : 'General feed',
      preferences: catIds,
      data: questions
    })
  } catch (e) {
    console.error('getPersonalisedHome error:', e.message)
    res.status(500).json({ message: 'Server error' })
  }
}

const makeFeed = (sortDir) => async (req, res) => {
  try {
    let [questions] = await db.query(`
      SELECT q.question_id, q.title, q.description, q.created_at, q.is_anonymous,
      COALESCE(SUBSTRING_INDEX(u.display_name, ' ', 1), u.username) AS username,
      COUNT(r.response_id) as interaction_count
      FROM questions q JOIN users u ON q.user_id = u.user_id
      LEFT JOIN responses r ON q.question_id = r.question_id
      GROUP BY q.question_id ORDER BY interaction_count ${sortDir}, q.created_at DESC LIMIT 20
      `)
    questions.forEach(q => { if (q.is_anonymous) q.username = 'Anonymous' })
    questions = await fillInDetails(questions, req.user.user_id)

    const label = sortDir === 'DESC' ? 'Trending' : 'Unanswered'
    res.json({ message: label + ' feed', data: questions })
  } catch (e) {
    console.error('makeFeed error:', e.message)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.getTrendingFeed = makeFeed('DESC')
exports.getUnansweredFeed = makeFeed('ASC')
