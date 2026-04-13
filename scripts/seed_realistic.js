require('dotenv').config();
const db = require('../config/db');

const categories = [
    'Technology', 'Food', 'Travel', 'Shopping', 'Lifestyle',
    'Study', 'Design', 'Entertainment', 'Fashion', 'Fitness',
    'Productivity', 'Relationships', 'Career', 'Beauty', 'Finance', 'Daily Decisions'
];

const indianFirstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Aryan", "Ananya", "Diya", "Kavya", "Ishita", "Neha", "Priya", "Riya", "Aarti", "Karan", "Rahul", "Rohan", "Sneha", "Kabir", "Meera", "Siddharth", "Tara"];
const westernFirstNames = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Emma", "Olivia", "Liam", "Noah"];
const indianLastNames = ["Sharma", "Patel", "Singh", "Kumar", "Das", "Bose", "Gupta", "Deshmukh", "Joshi", "Kapoor", "Chopra", "Rao", "Reddy", "Nair", "Iyer"];
const westernLastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson"];

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateName() {
    const isIndian = Math.random() > 0.5;
    const first = isIndian ? randomChoice(indianFirstNames) : randomChoice(westernFirstNames);
    const last = isIndian ? randomChoice(indianLastNames) : randomChoice(westernLastNames);
    return `${first} ${last}`;
}

const templates = {
    'Technology': [
        { t: "Should I buy the {itemA} or the {itemB} for college?", d: "I need something reliable for daily use and light to medium tasks.", o: ["{itemA}", "{itemB}"] },
        { t: "Is {itemA} really worth the upgrade over {itemB}?", d: "The price difference is quite steep, wondering if the features justify it.", o: ["Yes, get {itemA}", "No, stick with {itemB}"] },
        { t: "Which ecosystem is better right now: {itemA} or {itemB}?", d: "I'm thinking of switching my entire setup this year.", o: ["{itemA} ecosystem", "{itemB} ecosystem"] },
        { t: "For coding: {itemA} or {itemB}?", d: "I'm starting a bootcamp soon and need a solid machine.", o: ["{itemA}", "{itemB}"] },
        { t: "Should I repair my old {itemA} or buy a new {itemB}?", d: "Repair costs half as much as the new device.", o: ["Repair the {itemA}", "Buy the {itemB}"] }
    ],
    'Food': [
        { t: "What's better for a quick dinner: {itemA} or {itemB}?", d: "Super tired after a long day of work.", o: ["{itemA}", "{itemB}"] },
        { t: "Should I order {itemA} or cook {itemB} tonight?", d: "Want to save money but I'm feeling lazy.", o: ["Order {itemA}", "Cook {itemB}"] },
        { t: "Which cuisine is best for a first date? {itemA} or {itemB}?", d: "Trying to keep it classy but comfortable.", o: ["{itemA}", "{itemB}"] },
        { t: "Is authentic {itemA} better than modern fusion {itemB}?", d: "There are two highly rated places near me.", o: ["Authentic {itemA}", "Modern {itemB}"] },
        { t: "Best midnight snack: {itemA} or {itemB}?", d: "I'm craving something right now.", o: ["{itemA}", "{itemB}"] }
    ],
    'Travel': [
        { t: "Summer trip: {itemA} or {itemB}?", d: "Looking for a balance of relaxation and sightseeing.", o: ["{itemA}", "{itemB}"] },
        { t: "Is it better to travel {itemA} or {itemB}?", d: "I have 2 weeks off next month.", o: ["{itemA} style", "{itemB} style"] },
        { t: "Which city has better nightlife: {itemA} or {itemB}?", d: "Planning a trip with friends.", o: ["{itemA}", "{itemB}"] },
        { t: "Should I book my flight {itemA} or {itemB}?", d: "I've heard mixed advice on booking times.", o: ["{itemA}", "{itemB}"] },
        { t: "For a honeymoon: {itemA} or {itemB}?", d: "Want something unforgettable.", o: ["{itemA}", "{itemB}"] }
    ],
    'Shopping': [
        { t: "Should I buy the {itemA} or wait for the {itemB}?", d: "Hesitating because a newer version might drop soon.", o: ["Buy {itemA} now", "Wait for {itemB}"] },
        { t: "Which brand makes better quality basics: {itemA} or {itemB}?", d: "Looking to build a capsule wardrobe.", o: ["{itemA}", "{itemB}"] },
        { t: "Is it worth buying {itemA} from {itemB} or finding a dupe?", d: "The original is quite expensive.", o: ["Buy the original {itemA}", "Find a good dupe"] },
        { t: "Better investment: a high-end {itemA} or multiple {itemB}s?", d: "Deciding where to put my shopping budget.", o: ["High-end {itemA}", "Multiple {itemB}s"] },
        { t: "Should I shop for winter clothes at {itemA} or {itemB}?", d: "Need a warm coat and boots.", o: ["{itemA}", "{itemB}"] }
    ],
    'Lifestyle': [
        { t: "Should I adopt a {itemA} or a {itemB}?", d: "I have enough space for a pet but can't decide.", o: ["{itemA}", "{itemB}"] },
        { t: "Is it better to live in the {itemA} or the {itemB}?", d: "Considering a move next year.", o: ["{itemA}", "{itemB}"] },
        { t: "Should I pick up {itemA} or {itemB} as a new hobby?", d: "Need something relaxing for the weekends.", o: ["{itemA}", "{itemB}"] },
        { t: "Morning routine: start with {itemA} or {itemB}?", d: "Want to be more energized throughout the day.", o: ["Start with {itemA}", "Start with {itemB}"] },
        { t: "Minimalism or Maximalism when it comes to {itemA}?", d: "Redecorating my personal space.", o: ["Minimalist {itemA}", "Maximalist {itemA}"] }
    ],
    'Study': [
        { t: "Should I study {itemA} or {itemB} for my elective?", d: "Both seem interesting but I want something useful for my career.", o: ["{itemA}", "{itemB}"] },
        { t: "Is it better to take notes on {itemA} or use {itemB}?", d: "Trying to retain information better.", o: ["{itemA}", "{itemB}"] },
        { t: "Late night studying with {itemA} or early morning with {itemB}?", d: "I have a huge exam coming up.", o: ["Late night with {itemA}", "Early morning with {itemB}"] },
        { t: "Should I do a Master's in {itemA} right away, or {itemB} first?", d: "Not sure what the best path is.", o: ["Master's in {itemA}", "Do {itemB} first"] },
        { t: "Which study spot is better: {itemA} or {itemB}?", d: "I need minimal distractions.", o: ["{itemA}", "{itemB}"] }
    ],
    'Design': [
        { t: "Which tool is better for prototyping: {itemA} or {itemB}?", d: "Starting a new personal project.", o: ["{itemA}", "{itemB}"] },
        { t: "Should my portfolio be more {itemA} or {itemB}?", d: "I want to stand out to modern agencies.", o: ["{itemA}", "{itemB}"] },
        { t: "Is {itemA} still a trend or should I use {itemB} instead?", d: "Working on a brand identity.", o: ["{itemA}", "{itemB}"] },
        { t: "Better font pairing for a tech blog: {itemA} or {itemB}?", d: "Need a clean and readable aesthetic.", o: ["{itemA}", "{itemB}"] },
        { t: "Should I focus on {itemA} skills or {itemB} skills first?", d: "Trying to upskill this summer.", o: ["{itemA}", "{itemB}"] }
    ],
    'Entertainment': [
        { t: "Which show should I binge next: {itemA} or {itemB}?", d: "Need something engaging for the weekend.", o: ["{itemA}", "{itemB}"] },
        { t: "Is {itemA} worth seeing in theaters or should I wait for {itemB} streaming?", d: "Tickets are expensive.", o: ["See {itemA} in theaters", "Wait for streaming"] },
        { t: "Better gaming console to buy right now: {itemA} or {itemB}?", d: "Casual gamer looking for good exclusives.", o: ["{itemA}", "{itemB}"] },
        { t: "Should I read {itemA} or {itemB} first?", d: "I bought both books recently.", o: ["Read {itemA}", "Read {itemB}"] },
        { t: "Which streaming service is actually worth keeping: {itemA} or {itemB}?", d: "Need to cut down on subscriptions.", o: ["{itemA}", "{itemB}"] }
    ],
    'Fashion': [
        { t: "Are {itemA} still in style or should I get {itemB}?", d: "Looking to update my wardrobe.", o: ["Stick to {itemA}", "Switch to {itemB}"] },
        { t: "Which sneakers are more versatile: {itemA} or {itemB}?", d: "Need a pair for everyday wear.", o: ["{itemA}", "{itemB}"] },
        { t: "Should I splurge on a designer {itemA} or buy a cheaper {itemB}?", d: "I really love the designer one but the price is high.", o: ["Splurge on {itemA}", "Save with {itemB}"] },
        { t: "Does {itemA} look better matched with {itemB} or a classic jacket?", d: "Trying to put an outfit together.", o: ["Match with {itemB}", "Classic jacket"] },
        { t: "Silver or Gold {itemA} for daily wear?", d: "I have a neutral skin tone.", o: ["Silver", "Gold"] }
    ],
    'Fitness': [
        { t: "Is {itemA} or {itemB} better for losing weight?", d: "Starting a new fitness journey.", o: ["{itemA}", "{itemB}"] },
        { t: "Should I join a {itemA} class or a {itemB} class?", d: "Need some motivation to workout.", o: ["{itemA}", "{itemB}"] },
        { t: "Is it better to workout in the {itemA} or {itemB}?", d: "Trying to build a consistent habit.", o: ["{itemA}", "{itemB}"] },
        { t: "Are {itemA} supplements necessary if I'm already taking {itemB}?", d: "Trying to optimize my routine.", o: ["Yes, take both", "No, {itemB} is enough"] },
        { t: "Which home equipment is a better investment: {itemA} or {itemB}?", d: "Building a small home gym.", o: ["{itemA}", "{itemB}"] }
    ],
    'Productivity': [
        { t: "Should I use {itemA} or {itemB} for task management?", d: "My current system is a mess.", o: ["{itemA}", "{itemB}"] },
        { t: "Is the Pomodoro technique better than {itemA}?", d: "Struggling with focus lately.", o: ["Pomodoro", "{itemA}"] },
        { t: "Should I plan my week on {itemA} or a digital {itemB}?", d: "Trying to decide between analog and digital.", o: ["{itemA}", "{itemB}"] },
        { t: "Does waking up at {itemA} actually make you more productive than {itemB}?", d: "Considering shifting my sleep schedule.", o: ["Waking up at {itemA}", "Waking up at {itemB}"] },
        { t: "Which note-taking app is better for second brain: {itemA} or {itemB}?", d: "Want a reliable knowledge base.", o: ["{itemA}", "{itemB}"] }
    ],
    'Relationships': [
        { t: "Should I address the conflict {itemA} or {itemB}?", d: "Had a disagreement with a friend.", o: ["{itemA}", "{itemB}"] },
        { t: "Is {itemA} a good first date idea or is {itemB} safer?", d: "Meeting someone from an app soon.", o: ["{itemA}", "{itemB}"] },
        { t: "How to split chores evenly: {itemA} approach or {itemB} approach?", d: "Moving in with my partner.", o: ["{itemA}", "{itemB}"] },
        { t: "Should I invite {itemA} to my wedding even if I didn't invite {itemB}?", d: "Guest list drama.", o: ["Invite {itemA}", "Don't invite either"] },
        { t: "Is it okay to set boundaries by {itemA} or is {itemB} better?", d: "Dealing with a demanding coworker.", o: ["{itemA}", "{itemB}"] }
    ],
    'Career': [
        { t: "Should I take a higher paying job at {itemA} or a remote job at {itemB}?", d: "Money vs flexibility.", o: ["{itemA} (High Pay)", "{itemB} (Remote)"] },
        { t: "Is an MBA worth it for {itemA} or should I rely on {itemB}?", d: "Looking to advance to management.", o: ["MBA", "{itemB}"] },
        { t: "Should I list my {itemA} experience on my resume if I'm applying for {itemB}?", d: "Pivoting careers.", o: ["Yes, show {itemA}", "No, keep it relevant to {itemB}"] },
        { t: "Is it better to ask for a raise {itemA} or wait until {itemB}?", d: "I've take on a lot of new responsibilities.", o: ["Ask {itemA}", "Wait for {itemB}"] },
        { t: "Which skill is more valuable right now: {itemA} or {itemB}?", d: "Planning my learning budget for the year.", o: ["{itemA}", "{itemB}"] }
    ],
    'Beauty': [
        { t: "Should I buy {itemA} or {itemB} for acne-prone skin?", d: "Looking for a new serum.", o: ["{itemA}", "{itemB}"] },
        { t: "Is {itemA} a better moisturizer than {itemB}?", d: "My skin is super dry lately.", o: ["{itemA}", "{itemB}"] },
        { t: "Which mascara gives better volume: {itemA} or {itemB}?", d: "Need recommendations.", o: ["{itemA}", "{itemB}"] },
        { t: "Should I get a {itemA} cut or a {itemB} cut?", d: "Want a fresh look for summer.", o: ["{itemA} cut", "{itemB} cut"] },
        { t: "Is {itemA} sunscreen worth the hype over drugstore {itemB}?", d: "Trying to protect my skin daily.", o: ["Worth the hype", "Stick to drugstore"] }
    ],
    'Finance': [
        { t: "Should I invest my $10k in {itemA} or {itemB}?", d: "Looking for moderate long-term growth.", o: ["{itemA}", "{itemB}"] },
        { t: "Is it better to pay off my {itemA} loan first or save for a {itemB}?", d: "Trying to balance debt and savings.", o: ["Pay off {itemA}", "Save for {itemB}"] },
        { t: "Which rewards credit card is better: {itemA} or {itemB}?", d: "I travel a moderate amount.", o: ["{itemA}", "{itemB}"] },
        { t: "Should I keep my emergency fund in {itemA} or {itemB}?", d: "Want easy access but decent yield.", o: ["{itemA}", "{itemB}"] },
        { t: "Is buying a {itemA} right now better than renting a {itemB}?", d: "The market is a bit unpredictable.", o: ["Buy {itemA}", "Rent {itemB}"] }
    ],
    'Daily Decisions': [
        { t: "Should I wake up early and {itemA} or sleep in and {itemB}?", d: "Tomorrow is Saturday.", o: ["{itemA}", "{itemB}"] },
        { t: "Buy coffee at {itemA} today or make {itemB} at home?", d: "Trying to save money but craving something nice.", o: ["{itemA}", "Make {itemB}"] },
        { t: "Take the {itemA} route or the {itemB} route to work today?", d: "Traffic is slightly bad on both.", o: ["{itemA} route", "{itemB} route"] },
        { t: "Should I wear my {itemA} or my {itemB} to the casual office party?", d: "Don't want to overdress.", o: ["{itemA}", "{itemB}"] },
        { t: "Read a book on {itemA} or scroll through {itemB} for 30 minutes?", d: "Winding down for bed.", o: ["Read {itemA}", "Scroll {itemB}"] }
    ]
};

const items = {
    'Technology': [["MacBook Air M2", "Dell XPS 13"], ["iPhone 15 Pro", "Samsung S24 Ultra"], ["Sony WH-1000XM5", "AirPods Max"], ["iPad Pro", "Galaxy Tab S9"], ["Windows 11", "macOS Sonoma"], ["Mechanical Keyboard", "Magic Keyboard"], ["Steam Deck", "Nintendo Switch"], ["A 4K Monitor", "Dual 1080p Monitors"], ["Logitech MX Master", "Apple Magic Mouse"], ["Cloud Storage", "External SSD"]],
    'Food': [["Tacos", "Pizza"], ["Sushi", "Thai Curry"], ["Burger", "Salad"], ["Italian", "Mexican"], ["Ice Cream", "Brownie"], ["Cold Brew", "Iced Latte"], ["Home-cooked Pasta", "Takeout Noodles"], ["Indian Food", "Mediterranean Bowl"], ["Vegan Wrap", "Fried Chicken Sandwich"], ["Pancakes", "Waffles"]],
    'Travel': [["Japan", "Italy"], ["Backpacking", "Luxury Resort"], ["London", "Paris"], ["Bali", "Maldives"], ["Early Morning", "Late Night"], ["Winter Skiing", "Summer Beach"], ["Solo travel", "Group tour"], ["Airbnb", "Boutique Hotel"], ["Direct light", "Layover to save money"], ["Train journey", "Road trip"]],
    'Shopping': [["AirPods Max", "Sony WH-1000XM5"], ["Zara", "Uniqlo"], ["Sephora", "Ulta"], ["Dyson Airwrap", "Shark FlexStyle"], ["A Winter Coat", "A Leather Jacket"], ["Nike Dunks", "New Balance 550s"], ["Second-hand furniture", "IKEA"], ["Lululemon leggings", "Alo Yoga leggings"], ["An Espresso Machine", "A Nespresso Drop"], ["Kindle Paperwhite", "Physical Books"]],
    'Lifestyle': [["Dog", "Cat"], ["City center", "Suburbs"], ["Painting", "Pottery"], ["Yoga", "Meditation"], ["Minimalist aesthetic", "Cozy cluttered room"], ["Houseplants", "Fake plants"], ["Journaling", "Podcasts"], ["A standing desk", "Ergonomic chair"], ["Wake up at 6AM", "Sleep until 8AM"], ["Vinyl records", "Spotify Premium"]],
    'Study': [["Python", "JavaScript"], ["iPad with Apple Pencil", "Notebooks"], ["Library", "Cafe"], ["A Master's Degree", "A Bootcamp"], ["Flashcards", "Mind mapping"], ["Group sessions", "Solo focus time"], ["Listening to Lofi", "Complete silence"], ["Night shifts", "Early mornings"], ["Textbooks", "Video lectures"], ["Online Certifications", "In-person classes"]],
    'Design': [["Figma", "Adobe XD"], ["Minimalist", "Brutalist"], ["Dark mode", "Light mode"], ["San Francisco", "Inter"], ["UI/UX skills", "Graphic Design skills"], ["Webflow", "Framer"], ["Procreate", "Illustrator"], ["Stock photos", "Custom illustrations"], ["TailwindCSS", "Vanilla CSS"], ["React", "Vue"]],
    'Entertainment': [["Breaking Bad", "The Wire"], ["Dune 2", "Oppenheimer"], ["PS5", "Xbox Series X"], ["A Sci-Fi Novel", "A Fantasy Epic"], ["Netflix", "HBO Max"], ["Going to a concert", "Watching a live stream"], ["Board games", "Video games"], ["A Comedy Special", "A Dark Thriller"], ["Anime", "Live-action Drama"], ["Marvel", "DC"]],
    'Fashion': [["Baggy Jeans", "Skinny Jeans"], ["White Sneakers", "Black Boots"], ["Gucci", "Prada"], ["A Trench Coat", "A Puffer Jacket"], ["Silver Jewelry", "Gold Jewelry"], ["Oversized tees", "Fitted shirts"], ["Thrifting", "Fast Fashion"], ["Crossbody bag", "Tote bag"], ["Vintage watches", "Smartwatches"], ["Capsule wardrobe", "Trend pieces"]],
    'Fitness': [["Cardio", "Weightlifting"], ["Spin class", "Pilates"], ["Morning workout", "Evening workout"], ["Creatine", "Protein powder"], ["Dumbbells", "Resistance bands"], ["Running outdoors", "Treadmill"], ["CrossFit", "Calisthenics"], ["Pre-workout", "Coffee"], ["Rest day", "Active recovery"], ["A smart scale", "Measuring tape"]],
    'Productivity': [["Notion", "Obsidian"], ["Pomodoro", "Time Blocking"], ["A generic notebook", "An iPad planner"], ["5 AM", "7 AM"], ["Evernote", "Apple Notes"], ["To-Do Lists", "Calendar Scheduling"], ["Trello", "Asana"], ["Working from home", "Going to the office"], ["Listening to white noise", "Listening to classical music"], ["Reading self-help books", "Taking actionable courses"]],
    'Relationships': [["Face to face", "Over text"], ["Dinner date", "Coffee date"], ["50/50 split", "Proportional split"], ["Distant friends", "Toxic family members"], ["Having a direct conversation", "Giving them space"], ["Waiting for them to text", "Texting them first"], ["A large wedding", "An intimate elopement"], ["Moving in together quickly", "Taking things slow"], ["Couples therapy", "Working it out independently"], ["Apologizing first", "Waiting for an apology"]],
    'Career': [["A startup", "A corporate job"], ["A Bootcamp", "Self-teaching"], ["Retail experience", "Freelance work"], ["Before performance reviews", "During the review round"], ["Soft skills", "Technical skills"], ["LinkedIn networking", "Cold emailing"], ["A strict 9-to-5", "Flexible hours"], ["A management track", "An individual contributor track"], ["Stock options", "A higher base salary"], ["Staying at a job 5+ years", "Job hopping every 2 years"]],
    'Beauty': [["Salicylic Acid", "Benzoyl Peroxide"], ["Cerave", "Cetaphil"], ["Maybelline Sky High", "L'Oreal Lash Paradise"], ["A Bob", "Layers"], ["Supergoop", "La Roche Posay"], ["Matte lipstick", "Lip gloss"], ["Gua Sha", "Jade Roller"], ["Chemical exfoliant", "Physical scrub"], ["Gel nails", "Normal polish"], ["A 10-step routine", "A 3-step routine"]],
    'Finance': [["An Index Fund", "Individual Tech Stocks"], ["Student Loans", "House Deposit"], ["Chase Sapphire", "Amex Gold"], ["A High-Yield Savings Account", "A Roth IRA"], ["A Condo", "A House"], ["Crypto", "Bonds"], ["Budgeting apps", "A simple spreadsheet"], ["Paying off a car fast", "Investing the extra cash"], ["Buying coffee daily", "Making it at home"], ["A side hustle", "Overtime at work"]],
    'Daily Decisions': [["Go for a run", "Read a book"], ["Starbucks", "Instant Coffee"], ["Highway", "Scenic backroads"], ["A nice sweater", "A casual hoodie"], ["A Kindle", "TikTok"], ["Doing laundry tonight", "Leaving it for tomorrow"], ["Calling mom", "Texting mom"], ["Cooking a complex meal", "Making a sandwich"], ["Watching the news", "Listening to a podcast"], ["Working at a desk", "Working from the couch"]]
};

async function seedData() {
    try {
        console.log("Starting massive realistic data seed...");

        // Ensure constraints are in place
        await db.query('ALTER TABLE responses ADD UNIQUE KEY unique_vote (question_id, user_id)').catch(e => { });

        // Check if already seeded massive data (count > 500)
        const [qCountResult] = await db.query("SELECT COUNT(*) as count FROM questions");
        if (qCountResult[0].count > 700) {
            console.log("Already deeply seeded! Found over 700 questions. Proceeding to add users just in case.");
        }

        console.log("1. Generating 150 diverse users...");
        let userIds = [];
        for (let i = 0; i < 150; i++) {
            const name = generateName();
            const username = name.toLowerCase().replace(' ', '') + Math.floor(Math.random() * 999);
            const [userResult] = await db.query(
                "INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name)",
                [username, 'dummy_hash', name]
            );
            // Get ID regardless of if it inserted or ignored (if ignore, insertId is 0 so we need a select)
            if (userResult.insertId) {
                userIds.push(userResult.insertId);
            } else {
                const [rows] = await db.query("SELECT user_id FROM users WHERE username = ?", [username]);
                if (rows.length > 0) userIds.push(rows[0].user_id);
            }
        }

        // Add auth tests user
        const [kResult] = await db.query("INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE display_name=?", ["kabir", "hash", "Kabir", "Kabir"]);
        if (kResult.insertId) userIds.push(kResult.insertId);
        else {
            const [rows] = await db.query("SELECT user_id FROM users WHERE username = 'kabir'");
            userIds.push(rows[0].user_id);
        }

        console.log("2. Generating Categories...");
        const categoryIds = {};
        for (const cat of categories) {
            await db.query("INSERT IGNORE INTO categories (name) VALUES (?)", [cat]);
            const [rows] = await db.query("SELECT category_id FROM categories WHERE name = ?", [cat]);
            categoryIds[cat] = rows[0].category_id;
        }

        console.log("3. Generating minimum 50 realistic questions per category (800 total)...");
        let questionCount = 0;

        for (const cat of categories) {
            const catId = categoryIds[cat];
            const catTemplates = templates[cat];
            const catItems = items[cat];

            // Generate 50 unique-looking questions by combining templates and items
            for (let i = 0; i < 50; i++) {
                const templateObj = randomChoice(catTemplates);
                const itemsPair = randomChoice(catItems); // Returns [itemA, itemB]

                let title = templateObj.t.replace(/{itemA}/g, itemsPair[0]).replace(/{itemB}/g, itemsPair[1]);
                let description = templateObj.d.replace(/{itemA}/g, itemsPair[0]).replace(/{itemB}/g, itemsPair[1]);
                let optA = templateObj.o[0].replace(/{itemA}/g, itemsPair[0]).replace(/{itemB}/g, itemsPair[1]);
                let optB = templateObj.o[1].replace(/{itemA}/g, itemsPair[0]).replace(/{itemB}/g, itemsPair[1]);

                // If by pure chance it matches exactly an existing, we don't care, we just insert.
                const authorId = randomChoice(userIds);

                // Create random older created_at dates between now and 3 months ago so it looks authentic
                const daysAgo = Math.floor(Math.random() * 90);
                const simulatedDate = new Date();
                simulatedDate.setDate(simulatedDate.getDate() - daysAgo);

                const [qResult] = await db.query(
                    "INSERT INTO questions (user_id, title, description, is_anonymous, created_at) VALUES (?, ?, ?, ?, ?)",
                    [authorId, title, description, 0, simulatedDate]
                );

                const qId = qResult.insertId;
                await db.query("INSERT INTO question_categories (question_id, category_id) VALUES (?, ?)", [qId, catId]);

                const [optARes] = await db.query("INSERT INTO options (question_id, option_text) VALUES (?, ?)", [qId, optA]);
                const [optBRes] = await db.query("INSERT INTO options (question_id, option_text) VALUES (?, ?)", [qId, optB]);

                // Add votes randomly from some users
                const numVotes = Math.floor(Math.random() * 25); // At most 25 votes per typical question
                const shuffledUsers = [...userIds].sort(() => 0.5 - Math.random());
                for (let v = 0; v < numVotes; v++) {
                    const voter = shuffledUsers[v];
                    const chosenOpt = Math.random() > 0.5 ? optARes.insertId : optBRes.insertId;
                    await db.query("INSERT IGNORE INTO responses (question_id, user_id, option_id) VALUES (?, ?, ?)", [qId, voter, chosenOpt]);
                }

                questionCount++;
            }
            console.log("  - Seeded 50 for", cat);
        }

        console.log(`✅ Finished adding ${questionCount} realistic questions with random votes!`);
        process.exit(0);

    } catch (error) {
        console.error("❌ Seed Error:", error);
        process.exit(1);
    }
}

seedData();
