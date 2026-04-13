const db = require('../config/db')

exports.createQuestion = async (req, res) => {
    const conn = await db.getConnection()
    try {
        const { title, description = '', categories, options, is_anonymous, comments_enabled } = req.body
        if (!title || !Array.isArray(options) || options.length < 2)
            return res.status(400).json({ message: 'Invalid input' })

        await conn.beginTransaction()

        const [result] = await conn.query(
            'INSERT INTO questions (user_id, title, description, is_anonymous, comments_enabled) VALUES (?, ?, ?, ?, ?)',
            [req.user.user_id, title, description, is_anonymous ? 1 : 0, comments_enabled ? 1 : 0]
        )
        const qid = result.insertId

        if (categories?.length) {
            const [found] = await conn.query('SELECT category_id FROM categories WHERE name IN (?)', [categories])
            if (found.length > 0) {
                await conn.query('INSERT INTO question_categories (question_id, category_id) VALUES ?',
                    [found.map(c => [qid, c.category_id])])
            }
        }

        await conn.query('INSERT INTO options (question_id, option_text) VALUES ?',
            [options.map(o => [qid, o])])

        await conn.commit()
        res.status(201).json({ message: 'Created', questionId: qid })
    } catch (e) {
        await conn.rollback()
        res.status(500).json({ message: 'Server error' })
    } finally {
        conn.release()
    }
}

exports.getQuestionById = async (req, res) => {
    try {
        const [[q]] = await db.query(
            `SELECT q.*, COALESCE(SUBSTRING_INDEX(u.display_name, ' ', 1), u.username) as username FROM questions q JOIN users u ON q.user_id = u.user_id WHERE q.question_id = ?`,
            [req.params.id]
        )
        if (!q) return res.status(404).json({ message: 'Not found' })
        if (q.is_anonymous) q.username = 'Anonymous'

        const [opts] = await db.query(
            'SELECT o.option_id, o.option_text, (SELECT COUNT(*) FROM responses WHERE option_id = o.option_id) as votes FROM options o WHERE o.question_id = ?',
            [q.question_id]
        )
        const [cats] = await db.query(
            'SELECT c.name FROM categories c JOIN question_categories qc ON c.category_id = qc.category_id WHERE qc.question_id = ?',
            [q.question_id]
        )

        res.json({ ...q, categories: cats.map(c => c.name), options: opts })
    } catch (err) {
        console.error('getQuestionById error for id:', req.params.id, err.message, err.stack)
        res.status(500).json({ message: 'Server error', detail: err.message })
    }
}