const db = require('../config/db');

async function addUniqueConstraint() {
    try {
        console.log("Adding UNIQUE constraint to prevent duplicate votes...");

        // First, remove any existing duplicate entries
        await db.query(`
            DELETE r1 FROM responses r1
            INNER JOIN responses r2 
            WHERE r1.response_id > r2.response_id 
            AND r1.question_id = r2.question_id 
            AND r1.user_id = r2.user_id
        `);

        console.log("Cleaned up duplicate entries");

        // Now add the UNIQUE constraint
        await db.query(`
            ALTER TABLE responses 
            ADD UNIQUE KEY unique_user_question (question_id, user_id)
        `);

        console.log("✅ UNIQUE constraint added successfully!");
        console.log("Users can now only vote once per question.");

    } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
            console.log("✅ Constraint already exists!");
        } else {
            console.error("Error:", err.message);
        }
    } finally {
        process.exit();
    }
}

addUniqueConstraint();
