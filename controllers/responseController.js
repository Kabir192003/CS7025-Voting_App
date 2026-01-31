const db = require('../config/db');

exports.submitResponse = async (req, res) => {
    try {
        const { question_id, option_id, comment_text } = req.body;
        const userId = req.user.user_id;

        if (!question_id) {
            return res.status(400).json({ message: "question_id is required" });
        }

        if (!option_id && !comment_text) {
            return res.status(400).json({ message: "Either option_id (vote) or comment_text is required" });
        }

        // Check if question exists
        const [qCheck] = await db.query("SELECT * FROM questions WHERE question_id = ?", [question_id]);
        if (qCheck.length === 0) {
            return res.status(404).json({ message: "Question not found" });
        }

        // Insert Response
        await db.query(
            "INSERT INTO responses (question_id, user_id, option_id, comment_text) VALUES (?, ?, ?, ?)",
            [question_id, userId, option_id || null, comment_text || null]
        );

        res.status(201).json({ message: "Response submitted successfully" });

    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "You have already responded to this question." });
        }
        console.error("SUBMIT RESPONSE ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getResponses = async (req, res) => {
    try {
        const questionId = req.params.questionId;

        const [responses] = await db.query(
            `SELECT r.response_id, r.user_id, r.option_id, r.comment_text, r.created_at, u.username
       FROM responses r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.question_id = ?
       ORDER BY r.created_at DESC`,
            [questionId]
        );

        // Grouping stats if needed, for now just list
        // Optionally: count votes per option_id

        res.json(responses);

    } catch (err) {
        console.error("GET RESPONSES ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};