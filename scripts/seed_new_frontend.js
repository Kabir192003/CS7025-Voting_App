require('dotenv').config();
const db = require('../config/db');

const categories = [
    'Technology', 'Food', 'Travel', 'Shopping', 'Lifestyle',
    'Study', 'Design', 'Entertainment', 'Fashion', 'Fitness',
    'Productivity', 'Relationships', 'Career', 'Beauty', 'Finance', 'Daily Decisions'
];

// Helper to generate a realistic-ish question title based on category
function generateQuestionTitle(category, index) {
    const templates = [
        `What is your favorite {cat} choice?`,
        `Should I focus more on {cat} this year?`,
        `Best advice you ever received about {cat}?`,
        `Which {cat} approach is better for beginners?`,
        `How do you usually handle {cat} decisions?`,
        `Is {cat} overrated or underrated?`,
        `What's a common mistake people make in {cat}?`,
        `Recommendation needed for {cat} #${index}`,
        `Comparing options in {cat} - need help!`,
        `What's the future of {cat} looking like?`
    ];
    return templates[index % templates.length].replace('{cat}', category);
}

// Generate options based on categories
function generateOptions(category, index) {
    return [`Option A (${category} ${index})`, `Option B (${category} ${index})`];
}

async function seedData() {
    try {
        console.log("Starting DB Schema Update and Data Seed...");

        // 1. Alter Users Table
        console.log("Altering 'users' table to add new profile columns...");
        const alterQueries = [
            "ALTER TABLE users ADD COLUMN display_name VARCHAR(255) DEFAULT NULL;",
            "ALTER TABLE users ADD COLUMN avatar_data LONGTEXT DEFAULT NULL;",
            "ALTER TABLE users ADD COLUMN gender VARCHAR(50) DEFAULT NULL;",
            "ALTER TABLE users ADD COLUMN birthday VARCHAR(50) DEFAULT NULL;",
            "ALTER TABLE users ADD COLUMN region VARCHAR(255) DEFAULT NULL;",
            "ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL;"
        ];

        for (const query of alterQueries) {
            try {
                await db.query(query);
            } catch (err) {
                // Ignore errors if columns already exist (ER_DUP_FIELDNAME)
                if (err.code !== 'ER_DUP_FIELDNAME') {
                    console.error("Error altering table:", err.message);
                }
            }
        }
        console.log("✅ Users table updated with new columns.");

        // Create a dummy user to own these seeded questions
        const [userResult] = await db.query(
            "INSERT IGNORE INTO users (username, password_hash, display_name) VALUES (?, ?, ?)",
            ['seed_user', 'dummy_hash', 'Seed User']
        );
        let seedUserId = userResult.insertId;
        if (!seedUserId) {
            const [existing] = await db.query("SELECT user_id FROM users WHERE username = 'seed_user'");
            seedUserId = existing[0].user_id;
        }

        // 2. Insert Categories
        console.log("Inserting categories...");
        const categoryIds = {};
        for (const cat of categories) {
            await db.query("INSERT IGNORE INTO categories (name) VALUES (?)", [cat]);
            const [rows] = await db.query("SELECT category_id FROM categories WHERE name = ?", [cat]);
            categoryIds[cat] = rows[0].category_id;
        }
        console.log("✅ 16 Categories inserted.");

        // 3. Insert 30 questions per category
        console.log("Inserting 30 questions per category (480 total)...");
        let questionCount = 0;

        for (const cat of categories) {
            const catId = categoryIds[cat];
            for (let i = 1; i <= 30; i++) {
                const title = generateQuestionTitle(cat, i);
                const desc = `I'm struggling to decide on something related to ${cat}. Looking for community feedback!`;

                // Insert Question
                const [qResult] = await db.query(
                    "INSERT INTO questions (user_id, title, description, is_anonymous, comments_enabled) VALUES (?, ?, ?, ?, ?)",
                    [seedUserId, title, desc, 0, 1]
                );
                const questionId = qResult.insertId;

                // Associate Question with Category
                await db.query(
                    "INSERT INTO question_categories (question_id, category_id) VALUES (?, ?)",
                    [questionId, catId]
                );

                // Insert Options
                const options = generateOptions(cat, i);
                for (const opt of options) {
                    await db.query(
                        "INSERT INTO options (question_id, option_text) VALUES (?, ?)",
                        [questionId, opt]
                    );
                }

                questionCount++;
            }
        }

        console.log(`✅ Successfully inserted ${questionCount} questions with options and categories.`);
        console.log("Seed script finished completely.");

    } catch (error) {
        console.error("❌ Seed Script Error:", error);
    } finally {
        // Exit process
        process.exit();
    }
}

seedData();
