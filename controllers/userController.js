const db = require('../config/db');

// Get User Profile Info
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [users] = await db.query("SELECT user_id, username, created_at FROM users WHERE user_id = ?", [userId]);

    if (users.length === 0) return res.status(404).json({ message: "User not found" });

    // Also fetch user preferences
    const [prefs] = await db.query(`
      SELECT c.category_id, c.name 
      FROM user_preferences up 
      JOIN categories c ON up.category_id = c.category_id 
      WHERE up.user_id = ?
    `, [userId]);

    res.json({
      ...users[0],
      preferences: prefs
    });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Questions asked by User
exports.getUserQuestions = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const query = `
            SELECT q.question_id, q.title, q.description, q.created_at, q.is_anonymous, 
                   COUNT(r.response_id) as interaction_count 
            FROM questions q 
            LEFT JOIN responses r ON q.question_id = r.question_id 
            WHERE q.user_id = ? 
            GROUP BY q.question_id, q.title, q.description, q.created_at, q.is_anonymous
            ORDER BY q.created_at DESC
        `;

    const [questions] = await db.query(query, [userId]);
    res.json(questions);
  } catch (err) {
    console.error("GET USER QUESTIONS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Save or Update User Preferences
exports.savePreferences = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.user.user_id; // Auth middleware attaches 'user' object, not just 'user_id' usually. fix if needed based on auth middleware.
    const preferences = req.body.categories; // Note: app.js sends 'categories', not 'preferences'

    if (!Array.isArray(preferences) || preferences.length === 0) {
      return res.status(400).json({ message: 'No preferences selected' });
    }

    await connection.beginTransaction();

    // Remove old preferences
    await connection.query('DELETE FROM user_preferences WHERE user_id = ?', [userId]);

    // Insert new
    for (const catId of preferences) {
      await connection.query('INSERT INTO user_preferences (user_id, category_id) VALUES (?, ?)', [userId, catId]);
    }

    await connection.commit();
    res.json({ message: 'Preferences saved successfully' });

  } catch (err) {
    await connection.rollback();
    console.error('SAVE PREFS ERROR:', err);
    res.status(500).json({ message: 'Failed to save preferences' });
  } finally {
    connection.release();
  }
};

// Get Questions the User has answered/interacted with
exports.getUserAnswers = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get distinct questions that the user has responded to
    const query = `
            SELECT DISTINCT 
                q.question_id, 
                q.title, 
                q.description, 
                q.created_at, 
                q.is_anonymous,
                (SELECT COUNT(*) FROM responses WHERE question_id = q.question_id) as interaction_count,
                MAX(r.created_at) as last_interaction
            FROM responses r
            JOIN questions q ON r.question_id = q.question_id
            WHERE r.user_id = ?
            GROUP BY q.question_id, q.title, q.description, q.created_at, q.is_anonymous
            ORDER BY last_interaction DESC
        `;

    const [questions] = await db.query(query, [userId]);
    res.json(questions);
  } catch (err) {
    console.error("GET USER ANSWERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
