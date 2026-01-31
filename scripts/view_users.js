const db = require('../config/db');

async function viewUsers() {
    try {
        const [users] = await db.query('SELECT * FROM users ORDER BY user_id');

        console.log('\n📋 USERS TABLE DATA\n');
        console.log('─'.repeat(100));

        users.forEach(user => {
            console.log(`ID: ${user.user_id}`);
            console.log(`Username: ${user.username}`);
            console.log(`Password Hash: ${user.password_hash.substring(0, 20)}...`);
            console.log(`Created At: ${user.created_at}`);
            console.log('─'.repeat(100));
        });

        console.log(`\nTotal Users: ${users.length}\n`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

viewUsers();
