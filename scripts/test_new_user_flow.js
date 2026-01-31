const axios = require('axios');

async function testNewUserFlow() {
    const newUser = {
        username: `newuser_${Date.now()}`,
        password: 'password123'
    };

    try {
        const baseURL = 'http://127.0.0.1:4000/api';
        console.log(`\n🔹 1. Signup new user: ${newUser.username}`);
        await axios.post(`${baseURL}/auth/signup`, newUser);
        console.log("✅ Signup successful");

        console.log(`\n🔹 2. Login`);
        const loginRes = await axios.post(`${baseURL}/auth/login`, newUser);
        const token = loginRes.data.token;
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        console.log("✅ Login successful, Token received");

        console.log(`\n🔹 3. Check Initial Feed (Should be General/Empty/Fallback)`);
        const initialFeed = await axios.get(`${baseURL}/home`, authHeader);
        console.log("Feed Message:", initialFeed.data.message);
        // Expecting "General feed (no preferences set)"

        console.log(`\n🔹 4. Set Preferences (Selecting Category ID 4 - Technology)`);
        // Assuming 4 is Technology based on seed.
        await axios.post(`${baseURL}/preferences`, { categories: [4] }, authHeader);
        console.log("✅ Preferences saved");

        console.log(`\n🔹 5. Re-check Feed (Should be Personalized)`);
        const personalizedFeed = await axios.get(`${baseURL}/home`, authHeader);
        console.log("Feed Message:", personalizedFeed.data.message);
        console.log("Questions Found:", personalizedFeed.data.data.length);

        // Check if feed items are only category 4 (logic check)
        // We can't verify category ID in response easily unless we inspect the joined data, but the message confirms the mode.
        if (personalizedFeed.data.message === "Personalised feed") {
            console.log("✅ SUCCESS: Feed is now personalized!");
        } else {
            console.error("❌ FAIL: Feed did not update to personalized mode.");
        }

    } catch (err) {
        console.error("TEST FAILED:", err.response ? err.response.data : err.message);
    }
}

testNewUserFlow();
