const axios = require('axios');
const db = require('../config/db');

async function testFeed() {
    try {
        const username = 'testuser';

        console.log("Looking for user...");
        // 1. Get User ID
        const [users] = await db.query("SELECT user_id FROM users WHERE username = ?", [username]);
        console.log("User query returned:", users);
        if (users.length === 0) {
            console.log("User not found via DB check");
            return;
        }
        const userId = users[0].user_id;

        // 2. Login to get token
        // Assuming auth route is /api/auth/login and accepts username/password
        // If not, we might need to generate a token manually or adjust. 
        // Let's check authRoutes.js quickly or just manual token gen if easy.
        // Actually, let's try to hit the login endpoint.

        let token;
        try {
            console.log("Attempting login...");
            const loginRes = await axios.post('http://127.0.0.1:4000/api/auth/login', {
                username: 'testuser',
                password: 'password'
            });
            token = loginRes.data.token;
            console.log("Got token:", token ? "YES" : "NO");
        } catch (e) {
            console.error("Login failed:", e.message);
            // If login fails (maybe server down?), we generate token manually if we have jwt secret
            // But better to assume server running.
            process.exit(1);
        }

        // 3. Get Home Feed
        const res = await axios.get('http://localhost:4000/api/home', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("\n--- API Response ---");
        console.log("Message:", res.data.message);
        console.log("Preferences:", res.data.preferences);
        console.log("Questions returned:", res.data.data.length);
        res.data.data.forEach(q => {
            console.log(`- [${q.question_id}] ${q.title}`);
        });

        // 4. Verification Check
        // We expect "Technology" (React, Best lang) and "Finance" (Crypto)
        // We do NOT expect "Health" (Marathon) or "Sports" (World Cup)
        const titles = res.data.data.map(q => q.title);
        const hasTech1 = titles.includes("Best programming language 2026?");
        const hasTech2 = titles.includes("React vs Vue?");
        const hasFinance = titles.includes("Is crypto still a good investment?");
        const hasHealth = titles.includes("Tips for marathon training?");
        const hasSports = titles.includes("Who will win the World Cup?");

        if (hasTech1 && hasTech2 && hasFinance && !hasHealth && !hasSports) {
            console.log("\n✅ SUCCESS: Feed contains only preferred categories!");
        } else {
            console.log("\n❌ REFUSED: Feed content mismatch.");
            console.log("Expected Tech/Finance. Found unwanted items or missing wanted items.");
        }

    } catch (err) {
        console.error("Test Error:", err.message);
        if (err.response) console.error("Response data:", err.response.data);
    } finally {
        process.exit();
    }
}

testFeed();
