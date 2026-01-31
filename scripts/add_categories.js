const db = require('../config/db');

async function addCategories() {
    const categories = [
        'Technology',
        'Health & Wellness',
        'Finance',
        'Sports',
        'Travel',
        'Food & Cooking',
        'Entertainment',
        'Education & Career',
        'Fashion & Style',
        'Home & Garden'
    ];

    console.log("Adding/Updating categories...");

    try {
        for (const name of categories) {
            // Check if exists
            const [rows] = await db.query("SELECT category_id FROM categories WHERE name = ?", [name]);

            if (rows.length === 0) {
                // Insert
                await db.query("INSERT INTO categories (name) VALUES (?)", [name]);
                console.log(`✅ Added: ${name}`);
            } else {
                console.log(`ℹ️  Exists: ${name}`);
            }
        }

        // Verify count
        const [count] = await db.query("SELECT COUNT(*) as total FROM categories");
        console.log(`\nTotal Categories: ${count[0].total}`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

addCategories();
