const db = require('../config/db');

async function getCategoryIds() {
    try {
        const [categories] = await db.query(`
            SELECT category_id, name 
            FROM categories 
            WHERE name IN ('Technology', 'Health', 'Finance', 'Sports', 'General', 'Science')
            ORDER BY name
        `);

        console.log('\n📋 Category IDs:\n');
        categories.forEach(c => {
            console.log(`   { id: ${c.category_id}, name: '${c.name}' },`);
        });
        console.log('\n');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

getCategoryIds();
