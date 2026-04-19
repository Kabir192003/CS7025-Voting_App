/**
 * File: responseController.js
 * Purpose: Controller handling the secure recording of user votes and comments
 */

const db = require('../config/db')
const sanitize = require('../utils/sanitize')

exports.submitResponse = async (req, res) => {
    try {
        const { question_id, option_id } = req.body
        const comment_text = sanitize(req.body.comment_text)
        if (!question_id || (!option_id && !comment_text))
            return res.status(400).json({ message: 'Invalid input' })

        const [[exists]] = await db.query('SELECT 1 FROM questions WHERE question_id = ?', [question_id])
        if (!exists) return res.status(404).json({ message: 'Not found' })

        await db.query(
            'INSERT INTO responses (question_id, user_id, option_id, comment_text) VALUES (?, ?, ?, ?) ' +
            'ON DUPLICATE KEY UPDATE option_id = COALESCE(?, option_id), comment_text = COALESCE(?, comment_text)',
            [question_id, req.user.user_id, option_id || null, comment_text || null, option_id || null, comment_text || null]
        )

        res.status(201).json({ message: 'Submitted' })
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Server error' })
    }
}

exports.getResponses = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT r.response_id, r.user_id, r.option_id, r.comment_text, r.created_at, COALESCE(SUBSTRING_INDEX(u.display_name, ' ', 1), u.username) AS username ` +
            `FROM responses r JOIN users u ON r.user_id = u.user_id WHERE r.question_id = ? ORDER BY r.created_at DESC`,
            [req.params.questionId]
        )
        res.json(rows)
    } catch (e) {
        res.status(500).json({ message: 'Server error' })
    }
}