const axios = require('axios');
const db = require('../config/db');

async function testQA() {
    try {
        const username = 'testuser';

        // 1. Get User ID & Login
        const [users] = await db.query("SELECT user_id FROM users WHERE username = ?", [username]);
        if (users.length === 0) { console.log("User not found"); return; }

        console.log("Logging in...");
        const loginRes = await axios.post('http://127.0.0.1:4000/api/auth/login', {
            username: 'testuser',
            password: 'password'
        });
        const token = loginRes.data.token;
        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
        console.log("Logged in.");

        // 2. Create Question
        console.log("\nCreating Question...");
        const qData = {
            title: "Where should I go for vacation?",
            description: "Looking for somewhere warm.",
            options: ["Paris", "Tokyo", "Bali"],
            categories: [4], // Tech? No let's assume 4 is valid from previous seed. Seed had Tech=4 typically if first.
            // Actually let's just pick a valid category ID from DB.
            is_anonymous: false,
            comments_enabled: true
        };

        // Quick check for category
        const [cats] = await db.query("SELECT category_id FROM categories LIMIT 1");
        if (cats.length > 0) qData.categories = [cats[0].category_id];

        const createRes = await axios.post('http://127.0.0.1:4000/api/questions', qData, authHeaders);
        const questionId = createRes.data.questionId;
        console.log(`Question Created! ID: ${questionId}`);

        // 3. Get Question Details
        console.log("\nFetching Question Details...");
        const getQRes = await axios.get(`http://127.0.0.1:4000/api/questions/${questionId}`, authHeaders);
        const question = getQRes.data;
        console.log(`Title: ${question.title}`);
        console.log("Options:", question.options);

        if (question.options.length !== 3) {
            console.error("❌ ERROR: Expected 3 options");
        }

        // 4. Submit Response (Vote for option 2 + comment)
        console.log("\nSubmitting Response...");
        const voteOptionId = question.options[1].option_id; // Vote for 2nd option
        const resData = {
            question_id: questionId,
            option_id: voteOptionId,
            comment_text: "I love Tokyo!"
        };

        await axios.post('http://127.0.0.1:4000/api/responses', resData, authHeaders);
        console.log("Response submitted.");

        // 5. Verify Response
        console.log("\nVerifying Responses...");
        const getResRes = await axios.get(`http://127.0.0.1:4000/api/responses/${questionId}`, authHeaders);
        const responses = getResRes.data;
        console.log("Responses found:", responses.length);
        console.log("First response comment:", responses[0].comment_text);

        if (responses.length > 0 && responses[0].comment_text === "I love Tokyo!") {
            console.log("\n✅ SUCCESS: Q&A Flow Verified!");
        } else {
            console.log("\n❌ FAIL: Response not found or mismatch.");
        }

    } catch (err) {
        console.error("TEST FAILED:", err.response ? err.response.data : err.message);
    } finally {
        process.exit();
    }
}

testQA();
