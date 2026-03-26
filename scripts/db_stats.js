const db = require('../config/db');

(async function showStats() {
    try {
        console.log('\n📊 Database Statistics\n');

        const queries = {
            users: 'SELECT COUNT(*) as count FROM users',
            questions: 'SELECT COUNT(*) as count FROM questions',
            responses: 'SELECT COUNT(*) as count FROM responses',
            categories: 'SELECT COUNT(*) as count FROM categories'
        };

        for (const [key, sql] of Object.entries(queries)) {
            const [[{ count }]] = await db.query(sql);
            const icon = { users: '👥', questions: '❓', responses: '💬', categories: '📁' }[key];
            console.log(`${icon} Total ${key.charAt(0).toUpperCase() + key.slice(1)}: ${count}`);
        }

        console.log('\n📂 Questions per Category:\n');
        const [catStats] = await db.query(`SELECT c.name, COUNT(qc.question_id) as count FROM categories c LEFT JOIN question_categories qc ON c.category_id = qc.category_id GROUP BY c.category_id ORDER BY count DESC`);
        catStats.forEach(c => console.log(`   ${c.name}: ${c.count} questions`));

        console.log('\n🔥 Top 5 Most Active Questions:\n');
        const [trending] = await db.query(`SELECT q.title, COUNT(r.response_id) as response_count FROM questions q LEFT JOIN responses r ON q.question_id = r.question_id GROUP BY q.question_id ORDER BY response_count DESC LIMIT 5`);
        trending.forEach((q, i) => console.log(`   ${i + 1}. ${q.title} (${q.response_count} responses)`));

        console.log('\n✅ Unique Constraint Status:');
        const [indexes] = await db.query("SHOW INDEX FROM responses WHERE Key_name='unique_user_question'");
        console.log(`   ${indexes.length ? '✅ Duplicate vote prevention is ACTIVE' : '❌ No unique constraint found'}`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
})();
