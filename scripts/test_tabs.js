const axios = require('axios');
const db = require('../config/db');

async function testTabs() {
    try {
        const baseURL = 'http://127.0.0.1:4000/api';

        // 1. Get Token (using testuser from previous steps)
        const loginRes = await axios.post(`${baseURL}/auth/login`, { username: 'testuser', password: 'password' });
        const token = loginRes.data.token;
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        console.log("Logged in.");

        // 2. Add some dummy responses to influence trending
        // Let's find a question and spam it with responses? 
        // Or check what we have. From previous test_qa we voted on ID 6.
        // Let's create two new questions, A and B. Vote A 3 times. Vote B 0 times.

        console.log("\nSEEDING DATA FOR TRENDING TEST...");

        // Create Question A
        const qARes = await axios.post(`${baseURL}/questions`, {
            title: "Trending Question A",
            options: ["Opt1", "Opt2"],
            categories: [4],
            comments_enabled: true
        }, authHeader);
        const qAId = qARes.data.questionId;

        // Create Question B
        const qBRes = await axios.post(`${baseURL}/questions`, {
            title: "Unanswered Question B",
            options: ["Opt1", "Opt2"],
            categories: [4],
            comments_enabled: true
        }, authHeader);
        const qBId = qBRes.data.questionId;

        // Vote on A with multiple users
        console.log(`Voting on Question A (${qAId}) with multiple users...`);
        const optIdA = (await axios.get(`${baseURL}/questions/${qAId}`, authHeader)).data.options[0].option_id;

        // User 1 (Main test user)
        try { await axios.post(`${baseURL}/responses`, { question_id: qAId, option_id: optIdA }, authHeader); } catch (e) { }

        // Create temp user 2
        const u2 = { username: `u2_${Date.now()}`, password: 'password' };
        await axios.post(`${baseURL}/auth/signup`, u2);
        const t2 = (await axios.post(`${baseURL}/auth/login`, u2)).data.token;
        await axios.post(`${baseURL}/responses`, { question_id: qAId, option_id: optIdA }, { headers: { Authorization: `Bearer ${t2}` } });

        // Create temp user 3
        const u3 = { username: `u3_${Date.now()}`, password: 'password' };
        await axios.post(`${baseURL}/auth/signup`, u3);
        const t3 = (await axios.post(`${baseURL}/auth/login`, u3)).data.token;
        await axios.post(`${baseURL}/responses`, { question_id: qAId, option_id: optIdA }, { headers: { Authorization: `Bearer ${t3}` } });

        // 3. Check Trending
        console.log("\nCHECKING TRENDING FEED...");
        const trending = await axios.get(`${baseURL}/home/trending`, authHeader);
        const topQuestion = trending.data.data[0];
        console.log(`Top Trending: "${topQuestion.title}" with ${topQuestion.interaction_count} interactions`);

        if (topQuestion.question_id === qAId && topQuestion.interaction_count >= 3) {
            console.log("✅ Trending Logic Correct");
        } else {
            console.log("❌ Trending Logic Fail");
        }

        // 4. Check Unanswered
        console.log("\nCHECKING UNANSWERED FEED...");
        const unanswered = await axios.get(`${baseURL}/home/unanswered`, authHeader);
        const topUnanswered = unanswered.data.data[0]; // Should be one with 0 responses
        console.log(`Top Unanswered: "${topUnanswered.title}" with ${topUnanswered.interaction_count} interactions`);

        // Just check if interaction_count is 0
        if (topUnanswered.interaction_count == 0) {
            console.log("✅ Unanswered Logic Correct");
        } else {
            console.log("❌ Unanswered Logic Fail");
        }

    } catch (err) {
        console.error("TEST ERROR:", err.message);
        if (err.response) console.log(err.response.data);
    } finally {
        process.exit();
    }
}

testTabs();
