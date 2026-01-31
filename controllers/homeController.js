const db = require('../config/db');

const getPersonalisedHome = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // 1. Get user preferences
    const [prefs] = await db.query(
      "SELECT category_id FROM user_preferences WHERE user_id = ?",
      [userId]
    );

    let query;
    let params = [];

    if (prefs.length === 0) {
      // Fallback: No preferences, show latest questions
      query = `
        SELECT q.question_id, q.title, q.description, q.created_at, q.is_anonymous, u.username,
               (SELECT COUNT(*) FROM responses WHERE question_id = q.question_id) as interaction_count
        FROM questions q 
        JOIN users u ON q.user_id = u.user_id 
        ORDER BY q.created_at DESC 
        LIMIT 20
      `;
    } else {
      // Filter by preferences
      const categoryIds = prefs.map(p => p.category_id);
      query = `
        SELECT DISTINCT q.question_id, q.title, q.description, q.created_at, q.is_anonymous, u.username,
               (SELECT COUNT(*) FROM responses WHERE question_id = q.question_id) as interaction_count
        FROM questions q 
        JOIN question_categories qc ON q.question_id = qc.question_id 
        JOIN users u ON q.user_id = u.user_id 
        WHERE qc.category_id IN (?) 
        ORDER BY q.created_at DESC 
        LIMIT 50
      `;
      params = [categoryIds];
    }

    const [questions] = await db.query(query, params);

    // Mask anonymous users
    questions.forEach(q => {
      if (q.is_anonymous) q.username = "Anonymous";
    });

    res.json({
      message: prefs.length > 0 ? "Personalised feed" : "General feed (no preferences set)",
      preferences: prefs.map(p => p.category_id),
      data: questions
    });

  } catch (err) {
    console.error("HOME FEED ERROR >>>", err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTrendingFeed = async (req, res) => {
  try {
    const query = `
      SELECT q.question_id, q.title, q.description, q.created_at, q.is_anonymous, u.username, COUNT(r.response_id) as interaction_count
      FROM questions q
      JOIN users u ON q.user_id = u.user_id
      LEFT JOIN responses r ON q.question_id = r.question_id
      GROUP BY q.question_id, q.title, q.description, q.created_at, q.is_anonymous, u.username
      ORDER BY interaction_count DESC, q.created_at DESC
      LIMIT 20
    `;
    const [questions] = await db.query(query);

    questions.forEach(q => {
      if (q.is_anonymous) q.username = "Anonymous";
    });

    res.json({ message: "Trending feed", data: questions });
  } catch (err) {
    console.error("TRENDING FEED ERROR >>>", err.code, err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUnansweredFeed = async (req, res) => {
  try {
    const query = `
      SELECT q.question_id, q.title, q.description, q.created_at, q.is_anonymous, u.username, COUNT(r.response_id) as interaction_count
      FROM questions q
      JOIN users u ON q.user_id = u.user_id
      LEFT JOIN responses r ON q.question_id = r.question_id
      GROUP BY q.question_id, q.title, q.description, q.created_at, q.is_anonymous, u.username
      ORDER BY interaction_count ASC, q.created_at DESC
      LIMIT 20
    `;
    const [questions] = await db.query(query);

    questions.forEach(q => {
      if (q.is_anonymous) q.username = "Anonymous";
    });

    res.json({ message: "Unanswered feed", data: questions });
  } catch (err) {
    console.error("UNANSWERED FEED ERROR >>>", err.code, err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getPersonalisedHome, getTrendingFeed, getUnansweredFeed };

