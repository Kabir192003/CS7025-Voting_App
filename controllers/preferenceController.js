const db = require("../config/db");

exports.savePreferences = async (req, res) => {
  try {
    // 👇 authMiddleware sets this
    const userId = req.user.user_id;

    // 👇 body from curl
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({ message: "categories must be an array" });
    }

    // 🔥 clear old preferences
    await db.query(
      "DELETE FROM user_preferences WHERE user_id = ?",
      [userId]
    );

    // 🔥 insert new preferences
    for (const categoryId of categories) {
      await db.query(
        "INSERT INTO user_preferences (user_id, category_id) VALUES (?, ?)",
        [userId, categoryId]
      );
    }

    res.json({ message: "Preferences saved successfully" });

  } catch (err) {
    console.error("PREFERENCES ERROR >>>", err);
    res.status(500).json({ message: "Server error" });
  }
};
