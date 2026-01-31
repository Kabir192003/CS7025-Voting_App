const db = require('../config/db');

async function showStats() {
    try {
        console.log('\n📊 Database Statistics\n');

        const [users] = await db.query('SELECT COUNT(*) as count FROM users');
        console.log(`👥 Total Users: ${users[0].count}`);

        const [questions] = await db.query('SELECT COUNT(*) as count FROM questions');
        console.log(`❓ Total Questions: ${questions[0].count}`);

        const [responses] = await db.query('SELECT COUNT(*) as count FROM responses');
        console.log(`💬 Total Responses: ${responses[0].count}`);

        const [categories] = await db.query('SELECT COUNT(*) as count FROM categories');
        console.log(`📁 Total Categories: ${categories[0].count}`);

        console.log('\n📂 Questions per Category:\n');
        const [catStats] = await db.query(`
            SELECT c.name, COUNT(qc.question_id) as count
            FROM categories c
            LEFT JOIN question_categories qc ON c.category_id = qc.category_id
            GROUP BY c.category_id, c.name
            ORDER BY count DESC
        `);
        catStats.forEach(cat => {
            console.log(`   ${cat.name}: ${cat.count} questions`);
        });

        console.log('\n🔥 Top 5 Most Active Questions:\n');
        const [trending] = await db.query(`
            SELECT q.title, COUNT(r.response_id) as response_count
            FROM questions q
            LEFT JOIN responses r ON q.question_id = r.question_id
            GROUP BY q.question_id, q.title
            ORDER BY response_count DESC
            LIMIT 5
        `);
        trending.forEach((q, i) => {
            console.log(`   ${i + 1}. ${q.title} (${q.response_count} responses)`);
        });

        console.log('\n✅ Unique Constraint Status:');
        const [indexes] = await db.query(`
            SHOW INDEX FROM responses WHERE Key_name='unique_user_question'
        `);
        if (indexes.length > 0) {
            console.log('   ✅ Duplicate vote prevention is ACTIVE');
        } else {
            console.log('   ❌ No unique constraint found');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

showStats();
