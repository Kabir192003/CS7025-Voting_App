const db = require('../config/db');

exports.createQuestion = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { title, description, categories, options, is_anonymous, comments_enabled } = req.body;
        const userId = req.user.user_id;

        if (!title || !options || !Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ message: "Title and at least 2 options are required" });
        }

        // 1. Insert Question
        const [qRes] = await connection.query(
            "INSERT INTO questions (user_id, title, description, is_anonymous, comments_enabled) VALUES (?, ?, ?, ?, ?)",
            [userId, title, description || '', is_anonymous ? 1 : 0, comments_enabled ? 1 : 0]
        );
        const questionId = qRes.insertId;

        // 2. Insert Categories
        if (categories && Array.isArray(categories)) {
            for (const catId of categories) {
                await connection.query(
                    "INSERT INTO question_categories (question_id, category_id) VALUES (?, ?)",
                    [questionId, catId]
                );
            }
        }

        // 3. Insert Options
        for (const optText of options) {
            await connection.query(
                "INSERT INTO options (question_id, option_text) VALUES (?, ?)",
                [questionId, optText]
            );
        }

        await connection.commit();
        res.status(201).json({ message: "Question created successfully", questionId });

    } catch (err) {
        await connection.rollback();
        console.error("CREATE QUESTION ERROR:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        connection.release();
    }
};

exports.getQuestionById = async (req, res) => {
    try {
        const questionId = req.params.id;

        // Fetch Question Details
        const [questions] = await db.query(
            `SELECT q.*, u.username 
       FROM questions q 
       JOIN users u ON q.user_id = u.user_id 
       WHERE q.question_id = ?`,
            [questionId]
        );

        if (questions.length === 0) {
            return res.status(404).json({ message: "Question not found" });
        }

        const question = questions[0];

        // Anonymous check
        if (question.is_anonymous) {
            question.username = "Anonymous";
        }

        // Fetch Options
        const [options] = await db.query(
            "SELECT option_id, option_text FROM options WHERE question_id = ?",
            [questionId]
        );

        // Fetch Categories
        const [categories] = await db.query(
            `SELECT c.name FROM categories c 
       JOIN question_categories qc ON c.category_id = qc.category_id 
       WHERE qc.question_id = ?`,
            [questionId]
        );

        res.json({
            ...question,
            categories: categories.map(c => c.name),
            options
        });

    } catch (err) {
        console.error("GET QUESTION ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};