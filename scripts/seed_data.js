const db = require('../config/db');
const bcrypt = require('bcrypt');

const NAMES = [
    "Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Reyansh", "Aryan",
    "Ishaan", "Dhruv", "Kabir", "Vivaan", "Ananya", "Diya", "Gauri", "Isha",
    "Kavya", "Khushi", "Kiara", "Meera", "Aisha", "Rohan", "Vikram", "Neha",
    "Priya", "Rahul", "Suresh", "Amit", "Raj", "Deepak",
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
    "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Lisa", "Nancy", "Betty", "Margaret", "Sandra"
];

// 50+ Questions Per Category
const TEMPLATES = {
    'Technology': [
        { t: "Best programming language for web development?", opts: ["Python", "JavaScript", "Java", "C++"] },
        { t: "Is React better than Vue?", opts: ["React", "Vue", "Both good", "Neither"] },
        { t: "Best IDE for Python?", opts: ["VS Code", "PyCharm", "Sublime", "Vim"] },
        { t: "Should I learn TypeScript?", opts: ["Yes", "No", "Maybe"] },
        { t: "Best cloud provider?", opts: ["AWS", "Azure", "GCP", "DigitalOcean"] },
        { t: "Docker vs Kubernetes?", opts: ["Docker first", "K8s first", "Both", "Reference"] },
        { t: "Best DB for startups?", opts: ["Postgres", "Mongo", "MySQL", "Firebase"] },
        { t: "Will AI replace coders?", opts: ["Yes", "No", "Partially", "Assist only"] },
        { t: "Best framework for REST APIs?", opts: ["Express", "Django", "Spring", "FastAPI"] },
        { t: "DevOps neccessary for juniors?", opts: ["Yes", "No", "Good to know", "Later"] },
        { t: "Mac vs Windows for dev?", opts: ["Mac", "Windows", "Linux", "Dual boot"] },
        { t: "Best mobile stack?", opts: ["Flutter", "React Native", "Native", "Ionic"] },
        { t: "Is PHP dead?", opts: ["Yes", "No", "Dying", "Evolving"] },
        { t: "Best frontend framework 2026?", opts: ["React", "Vue", "Svelte", "Angular"] },
        { t: "Rust vs Go?", opts: ["Rust", "Go", "Both", "Neither"] },
        { t: "GraphQL vs REST?", opts: ["GraphQL", "REST", "gRPC", "Hybrid"] },
        { t: "Best AI model?", opts: ["GPT-5", "Claude", "Gemini", "Llama"] },
        { t: "Tabs or Spaces?", opts: ["Tabs", "Spaces", "Prettier decides"] },
        { t: "Vim or Emacs?", opts: ["Vim", "Emacs", "VS Code", "Nano"] },
        { t: "Dark mode or Light mode?", opts: ["Dark", "Light", "Auto"] },
        { t: "Best Linux distro?", opts: ["Ubuntu", "Arch", "Fedora", "Debian"] },
        { t: "Is blockchain useful?", opts: ["Yes", "No", "Niche", "Scam"] },
        { t: "Best cybersecurity cert?", opts: ["CISSP", "CEH", "OSCP", "Sec+"] },
        { t: "Python or Java for backend?", opts: ["Python", "Java", "Node", "Go"] },
        { t: "Is C++ still relevant?", opts: ["Yes", "No", "Video games", "Embedded"] },
        { t: "Best note taking app for devs?", opts: ["Obsidian", "Notion", "Evernote", "Apple Notes"] },
        { t: "Mechanical keyboard switches?", opts: ["Blue", "Red", "Brown", "Topre"] },
        { t: "Multi-monitor or Ultrawide?", opts: ["Dual", "Ultrawide", "Single", "Triple"] },
        { t: "Standing desk?", opts: ["Yes", "No", "Sometimes"] },
        { t: "Work from home or Office?", opts: ["WFH", "Office", "Hybrid"] },
        { t: "Best browser for dev?", opts: ["Chrome", "Firefox", "Edge", "Safari"] },
        { t: "Tailwind or Bootstrap?", opts: ["Tailwind", "Bootstrap", "CSS Modules", "Vanilla"] },
        { t: "SQL or NoSQL?", opts: ["SQL", "NoSQL", "Graph", "Time-series"] },
        { t: "Monolith or Microservices?", opts: ["Monolith", "Microservices", "Serverless"] },
        { t: "Jira vs Trello?", opts: ["Jira", "Trello", "Linear", "Asana"] },
        { t: "Slack vs Teams?", opts: ["Slack", "Teams", "Discord"] },
        { t: "GitLab vs GitHub?", opts: ["GitHub", "GitLab", "Bitbucket"] },
        { t: "CI/CD tool?", opts: ["Jenkins", "GitHub Actions", "CircleCI", "Travis"] },
        { t: "Best way to learn coding?", opts: ["Docs", "Videos", "Bootcamp", "Building"] },
        { t: "LeetCode necessary?", opts: ["Yes", "No", "FAANG only", "Basic Algos"] },
        { t: "Favorite tech podcast?", opts: ["Syntax", "Lex Fridman", "Changelog", "None"] },
        { t: "AR/VR future?", opts: ["Big", "Niche", "Flopped", "Gaming only"] },
        { t: "Web3 future?", opts: ["Bright", "Dead", "Scam", "Niche"] },
        { t: "Coding music?", opts: ["Lofi", "Metal", "Classical", "Silence"] },
        { t: "Coffee or Tea?", opts: ["Coffee", "Tea", "Energy Drinks", "Water"] },
        { t: "Startups or Big Tech?", opts: ["Startup", "Big Tech", "Freelance"] },
        { t: "Game dev engine?", opts: ["Unity", "Unreal", "Godot", "Custom"] },
        { t: "Data Science language?", opts: ["Python", "R", "Julia", "Scala"] },
        { t: "Best terminal?", opts: ["iTerm2", "Hyper", "Terminal", "Alacritty"] },
        { t: "Self-taught or Degree?", opts: ["Self-taught", "Degree", "Bootcamp"] }
    ],
    'Health': [
        // Diet, Nutrition, Food focused
        { t: "Best diet for weight loss?", opts: ["Keto", "Intermittent Fasting", "Calorie Deficit", "Paleo"] },
        { t: "Meals per day?", opts: ["3", "5-6 small", "2 (IF)", "OMAD"] },
        { t: "Is breakfast essential?", opts: ["Yes", "No", "Depends", "Skip it"] },
        { t: "Best vegetarian protein?", opts: ["Lentils", "Paneer/Tofu", "Chickpeas", "Quinoa"] },
        { t: "Daily water intake?", opts: ["2L", "3L", "4L", "When thirsty"] },
        { t: "Are carbs bad?", opts: ["Yes", "No", "Processed only", "Sugar only"] },
        { t: "Dinner time?", opts: ["6 PM", "7 PM", "8 PM", "Late"] },
        { t: "Intermittent Fasting safety?", opts: ["Safe", "Unsafe", "Consult doctor", "Effective"] },
        { t: "Muscle building food?", opts: ["Chicken", "Eggs", "Whey", "Fish"] },
        { t: "Stop sugar cravings?", opts: ["Fruit", "Water", "Willpower", "Gum"] },
        { t: "Organic food worth it?", opts: ["Yes", "No", "Some items", "Marketing"] },
        { t: "Best energy snack?", opts: ["Nuts", "Banana", "Coffee", "Chocolate"] },
        { t: "Gut health tips?", opts: ["Yogurt", "Fiber", "Water", "Supplements"] },
        { t: "Coffee: Good or Bad?", opts: ["Good", "Bad", "Moderation", "Black only"] },
        { t: "Best cooking oil?", opts: ["Olive", "Coconut", "Mustard", "Ghee"] },
        { t: "Eggs: Healthy?", opts: ["Yes", "No", "Whites only", "Limit yolks"] },
        { t: "Supplements needed?", opts: ["Yes", "No", "Vitamin D", "Multivitamin"] },
        { t: "Vegan diet healthy?", opts: ["Yes", "No", "Hard to balance", "Ethical only"] },
        { t: "Cheat meals?", opts: ["Weekly", "Monthly", "Never", "In moderation"] },
        { t: "Salt intake?", opts: ["Low", "Moderate", "High", "Sea salt"] },
        { t: "Green tea benefits?", opts: ["Real", "Hype", "Minor", "Taste only"] },
        { t: "Dairy: Good or Bad?", opts: ["Good", "Bad for skin", "Bloating", "Calcium source"] },
        { t: "Gluten free necessary?", opts: ["Yes", "No", "Celiacs only", "Trend"] },
        { t: "Probiotics?", opts: ["Pills", "Food", "Not needed", "Yogurt"] },
        { t: "Best fruit?", opts: ["Apple", "Berry", "Banana", "Citrus"] },
        { t: "Best vegetable?", opts: ["Spinach", "Broccoli", "Kale", "Carrot"] },
        { t: "Red meat?", opts: ["Avoid", "Limit", "Eat freely", "Iron source"] },
        { t: "Fish oil?", opts: ["Essential", "Eat fish", "Waste", "Good for brain"] },
        { t: "Protein powder?", opts: ["Whey", "Casein", "Plant", "Food is better"] },
        { t: "Creatine safe?", opts: ["Yes", "No", " kidney risk", "Best supplement"] },
        { t: "Pre-workout meal?", opts: ["Carbs", "Protein", "Nothing", "Caffeine"] },
        { t: "Post-workout meal?", opts: ["Protein shake", "Meal", "Carbs", "Water"] },
        { t: "Hydration drink?", opts: ["Water", "Electrolytes", "Coconut water", "Sports drink"] },
        { t: "Sugar substitute?", opts: ["Stevia", "Honey", "Maple syrup", "None"] },
        { t: "Spicy food?", opts: ["Good", "Bad for stomach", "Boosts metabolism", "Tasty"] },
        { t: "Raw vs Cooked veggies?", opts: ["Raw", "Cooked", "Mix", "Steamed"] },
        { t: "Juicing?", opts: ["Healthy", "Too much sugar", "Eat whole", "Detox myth"] },
        { t: "Smoothies?", opts: ["Good meal replacement", "Sugar bomb", "Snack", "Post-workout"] },
        { t: "Superfoods?", opts: ["Real", "Marketing", "Good addition", "Overpriced"] },
        { t: "Dark chocolate?", opts: ["Healthy", "Candy", "Bitter", "Antioxidants"] },
        { t: "Almond milk vs Diary?", opts: ["Almond", "Dairy", "Oat", "Soy"] },
        { t: "Soy healthy?", opts: ["Yes", "No", "For women", "In moderation"] },
        { t: "Fasting duration?", opts: ["12h", "16h", "24h", "48h"] },
        { t: "Calorie counting?", opts: ["Works", "Obsessive", "Guide only", "Useless"] },
        { t: "Intuitive eating?", opts: ["Best", "Hard", "Gain weight", "For maintenance"] },
        { t: "Meal prepping?", opts: ["Time saver", "Boring", "Healthy", "Expensive"] },
        { t: "Eating out?", opts: ["Limit", "Never", "Social only", "Choose healthy"] },
        { t: "Late night snacks?", opts: ["Bad", "Ok if small", "Protein only", "Fruit"] },
        { t: "Fiber intake?", opts: ["Increase", "Decrease", "Supplements", "Vegetables"] },
        { t: "Water before meals?", opts: ["Yes", "No", "Digestion issue", "Weight loss"] }
    ],
    'Finance': [
        { t: "Best investment for beginners?", opts: ["Index Funds", "FD", "Gold", "Real Estate"] },
        { t: "Bitcoin in 2026?", opts: ["Buy", "Sell", "Hold", "Ignore"] },
        { t: "Stocks vs Mutual Funds?", opts: ["Stocks", "MFs", "ETFs", "Bonds"] },
        { t: "Retirement savings?", opts: ["401k", "IRA", "Real Estate", "Cash"] },
        { t: "SIP vs Lumpsum?", opts: ["SIP", "Lumpsum", "Both", "Market timing"] },
        { t: "Buy house or Rent?", opts: ["Buy", "Rent", "Invest diff", "Nomad"] },
        { t: "Budgeting method?", opts: ["50/30/20", "Zero-based", "Envelope", "None"] },
        { t: "Debt or Invest?", opts: ["Debt first", "Invest first", "Both", "Math based"] },
        { t: "Credit cards?", opts: ["Points", "Cashback", "Debt trap", "Build credit"] },
        { t: "Emergency fund size?", opts: ["3 months", "6 months", "1 year", "$10k"] },
        { t: "Fire movement?", opts: ["Goal", "Impossible", "Boring", "Risky"] },
        { t: "Side hustles?", opts: ["Necessary", "Distraction", "Fun", "Passive income"] },
        { t: "Inflation hedge?", opts: ["Gold", "Real Estate", "Stocks", "Bitcoin"] },
        { t: "Term insurance?", opts: ["Must have", "Waste", "Whole life", "Employer only"] },
        { t: "Health insurance?", opts: ["Critical", "Employer", "State", "Self-pay"] },
        { t: "Robo-advisors?", opts: ["Good", "Fees too high", "DIY better", "Convenient"] },
        { t: "Active vs Passive?", opts: ["Passive", "Active", "Mix", "Day trading"] },
        { t: "Day trading?", opts: ["Profitable", "Gambling", "Full time job", "Stressful"] },
        { t: "Forex trading?", opts: ["Scam", "Legit", "Hard", "High risk"] },
        { t: "Options trading?", opts: ["Income", "Gambling", "Hedge", "Complex"] },
        { t: "Real Estate Crowdfunding?", opts: ["Good", "Illiquid", "Risky", "Unknown"] },
        { t: "Gold vs Digital Gold?", opts: ["Physical", "Digital", "SGB", "Jewelry"] },
        { t: "Save percentage?", opts: ["10%", "20%", "50%", "As much as possible"] },
        { t: "Financial advisor?", opts: ["Hire one", "DIY", "Robo", "Books"] },
        { t: "Best finance book?", opts: ["Rich Dad", "Psychology of Money", "Intelligent Investor", "Total Money Makeover"] },
        { t: "Student loans?", opts: ["Pay fast", "Min payment", "Forgiveness", "Refinance"] },
        { t: "Car buying?", opts: ["New", "Used", "Lease", "Public transport"] },
        { t: "Wedding cost?", opts: ["Splurge", "Budget", "Elope", "City Hall"] },
        { t: "Kids cost?", opts: ["Expensive", "Manageable", "Worth it", "Delay"] },
        { t: "Travel budget?", opts: ["Priority", "Luxury", "Backpack", "Staycation"] },
        { t: "Frugality?", opts: ["Good", "Cheap", "Balance", "Smart"] },
        { t: "Lottery?", opts: ["Tax on poor", "Fun", "Hope", "Never"] },
        { t: "Charity?", opts: ["10%", "Ad-hoc", "Time", "Product"] },
        { t: "Taxes?", opts: ["Pay fully", "Optimize", "Loophole", "Move"] },
        { t: "Offshore accounts?", opts: ["Legal", "Shady", "Rich only", "Tax haven"] },
        { t: "Retirement age?", opts: ["60", "65", "50", "Never"] },
        { t: "Universal Basic Income?", opts: ["Needed", "Inflationary", "Socialism", "Testing"] },
        { t: "Cash vs Digital?", opts: ["Cash is king", "Digital", "Cards", "Crypto"] },
        { t: "Banks vs Credit Unions?", opts: ["Bank", "Credit Union", "Neobank", "Fintech"] },
        { t: "Credit score importance?", opts: ["High", "Medium", "Low", "Obsessive"] },
        { t: "Loan to family?", opts: ["Gift it", "Contract", "Never", "Interest free"] },
        { t: "Prenup?", opts: ["Smart", "Unromantic", "Rich only", "Essential"] },
        { t: "Joint accounts?", opts: ["Yes", "No", "Hybrid", "Bills only"] },
        { t: "Allowance for kids?", opts: ["Yes", "No", "For chores", "Weekly"] },
        { t: "Inheritance?", opts: ["Divide equal", "Merit", "Charity", "Spent it"] },
        { t: "Net worth tracking?", opts: ["Monthly", "Yearly", "Daily", "Never"] },
        { t: "Lifestyle inflation?", opts: ["Avoid", "Enjoy", "Balance", "Inevitable"] },
        { t: "Tech stocks?", opts: ["Bubble", "Future", "Volatile", "Overvalued"] },
        { t: "Dividends vs Growth?", opts: ["Growth", "Dividends", "Both", "Index"] },
        { t: "NFTs investment?", opts: ["Dead", "Future art", "Scam", "Membership"] }
    ],
    'Sports': [
        { t: "2026 World Cup Winner?", opts: ["Brazil", "France", "Argentina", "Germany"] },
        { t: "GOAT of Cricket?", opts: ["Sachin", "Kohli", "Bradman", "Richards"] },
        { t: "Football vs Cricket?", opts: ["Football", "Cricket", "Both", "Neither"] },
        { t: "MI vs CSK?", opts: ["MI", "CSK", "RCB", "KKR"] },
        { t: "Best football position?", opts: ["Striker", "Mid", "Defender", "Goalie"] },
        { t: "India T20 WC chances?", opts: ["Win", "Semis", "Finals", "Group stage"] },
        { t: "Tennis GOAT?", opts: ["Djokovic", "Nadal", "Federer", "Alcaraz"] },
        { t: "Best IPL Team?", opts: ["MI", "CSK", "KKR", "SRH"] },
        { t: "Basketball GOAT?", opts: ["Jordan", "LeBron", "Kobe", "Kareem"] },
        { t: "Esports Olympics?", opts: ["Yes", "No", "Maybe", "Separate event"] },
        { t: "F1 vs NASCAR?", opts: ["F1", "NASCAR", "IndyCar", "Rally"] },
        { t: "Best F1 Driver?", opts: ["Hamilton", "Verstappen", "Schumacher", "Senna"] },
        { t: "Olympics vs World Cup?", opts: ["Olympics", "World Cup", "Super Bowl", "IPL"] },
        { t: "Test Cricket dead?", opts: ["No", "Yes", "Dying", "Best format"] },
        { t: "T20 vs ODIs?", opts: ["T20", "ODI", "Test", "The Hundred"] },
        { t: "Messi vs Ronaldo?", opts: ["Messi", "Ronaldo", "Pele", "Maradona"] },
        { t: "Best league?", opts: ["EPL", "La Liga", "Bundesliga", "Serie A"] },
        { t: "UFC vs Boxing?", opts: ["UFC", "Boxing", "WWE", "Kickboxing"] },
        { t: "McGregor vs Khabib?", opts: ["Khabib", "McGregor", "Rematch", "Neither"] },
        { t: "Best athlete ever?", opts: ["Phelps", "Bolt", "Ali", "Serena"] },
        { t: "Women's sports growth?", opts: ["Great", "Slow", "Needs money", "Exciting"] },
        { t: "VAR in football?", opts: ["Good", "Ruins flow", "Needs fix", "Remove it"] },
        { t: "DRS in cricket?", opts: ["Essential", "Flawed", "Umpire's call", "Fair"] },
        { t: "Salary caps?", opts: ["Fair", "Unfair", "Needed", "Socialism"] },
        { t: "Doping in sports?", opts: ["Strict ban", "Allow it", "Hard to stop", "Everywhere"] },
        { t: "College sports paid?", opts: ["Yes", "No", "Scholarship", "Endorsements"] },
        { t: "Winter vs Summer Olympics?", opts: ["Summer", "Winter", "Both", "X Games"] },
        { t: "X Games?", opts: ["Cool", "Dangerous", "Niche", "Olympics"] },
        { t: "Skateboarding sport?", opts: ["Yes", "Lifestyle", "Art", "Hobby"] },
        { t: "Chess a sport?", opts: ["Yes", "No", "Mind sport", "Game"] },
        { t: "Poker a sport?", opts: ["Yes", "No", "Gambling", "Skill game"] },
        { t: "Golf boring?", opts: ["Yes", "No", "Fun to play", "Relaxing"] },
        { t: "Super Bowl halftime?", opts: ["Best part", "Game better", "Commercials", "Skip"] },
        { t: "Fantasy sports?", opts: ["Love it", "Gambling", "Time waste", "Fun with friends"] },
        { t: "Sports betting?", opts: ["Legalize", "Ban", "Regulate", "Fun"] },
        { t: "Worst injury?", opts: ["ACL", "Concussion", "Broken bone", "Ego"] },
        { t: "Best stadium?", opts: ["Camp Nou", "Wembley", "MCG", "Bernabeu"] },
        { t: "Best atmosphere?", opts: ["Anfield", "Bombonera", "Eden Gardens", "Signal Iduna"] },
        { t: "Marathon running?", opts: ["Goal", "Crazy", "Boring", "Healthy"] },
        { t: "Crossfit?", opts: ["Cult", "Great workout", "Dangerous", "Sport"] },
        { t: "Yoga sport?", opts: ["Exercise", "Spiritual", "Recovery", "Lifestyle"] },
        { t: "Swimming vs Running?", opts: ["Swimming", "Running", "Cycling", "Triathlon"] },
        { t: "Hiking vs Gym?", opts: ["Hiking", "Gym", "Home workout", "Sports"] },
        { t: "Surfing vs Skiing?", opts: ["Surf", "Ski", "Snowboard", "Skate"] },
        { t: "Sports cars?", opts: ["Ferrari", "Lambo", "Porsche", "McLaren"] },
        { t: "MotoGP vs F1?", opts: ["MotoGP", "F1", "WRC", "Formula E"] },
        { t: "Sports movies?", opts: ["Rocky", "Moneyball", "Coach Carter", "Space Jam"] },
        { t: "Jersey collecting?", opts: ["Hobby", "Expensive", "Cool", "Pointless"] },
        { t: "Autographs?", opts: ["Value", "Memory", "For kids", "Resell"] },
        { t: "Live vs TV?", opts: ["Live", "TV", "Highlights", "Radio"] }
    ],
    'Science': [
        // Pure science: Space, Physics, Chem, Bio, Env (No Health)
        { t: "AI Consciousness?", opts: ["Possible", "Impossible", "Simulation", "Only mimick"] },
        { t: "Reverse climate change?", opts: ["Yes", "No", "Mitigate", "Adapt"] },
        { t: "Mars colonization?", opts: ["2030s", "2050s", "Never", "Moon first"] },
        { t: "Quantum computing?", opts: ["Revolution", "Niche", "Theory", "Encryption breaker"] },
        { t: "Electric Vehicles?", opts: ["Future", "Stopgap", "Hydrogen", "Public transport"] },
        { t: "Alien life?", opts: ["Exist", "Alone", "Microbial", "Visiting us"] },
        { t: "Nuclear energy?", opts: ["Essential", "Too dangerous", "Fusion", "Waste issue"] },
        { t: "Renewable future?", opts: ["Solar", "Wind", "Hydro", "Fusion"] },
        { t: "Gene editing (CRISPR)?", opts: ["Cure all", "Unethical", "Regulated", "Superhumans"] },
        { t: "Space tourism?", opts: ["Billionaires", "Common soon", "Wasteful", "Exciting"] },
        { t: "Time travel?", opts: ["Forward only", "Backward too", "Impossible", "Multiverse"] },
        { t: "Multiverse theory?", opts: ["Real", "Fiction", "Math trick", "Unprovable"] },
        { t: "Dark matter?", opts: ["Particle", "Gravity error", "Unknown", "Black holes"] },
        { t: "String theory?", opts: ["Beautiful math", "Reality", "Dead end", "Untestable"] },
        { t: "Origin of life?", opts: ["Panspermia", "Primordial soup", "Vents", "Divine"] },
        { t: "Evolution?", opts: ["Fact", "Theory", "Directed", "Simulation"] },
        { t: "Big Bang?", opts: ["Start", "Cycle", "Bubble", "God"] },
        { t: "Black holes?", opts: ["Portals", "Crushers", "Holograms", "Singularities"] },
        { t: "Speed of light travel?", opts: ["Warp drive", "Impossible", "Wormholes", "Generation ship"] },
        { t: "Fermi Paradox?", opts: ["Rare Earth", "Filters", "Hidden", "Zoo hypothesis"] },
        { t: "Plastic pollution?", opts: ["Recycle", "Ban single use", "Bacteria", "Inescapable"] },
        { t: "Ocean exploration?", opts: ["More than space", "Scary", "Resources", "Undersea cities"] },
        { t: "Asteroid mining?", opts: ["Trillions", "Hard", "Future economy", "Legal mess"] },
        { t: "Space elevator?", opts: ["Carbon nanotubes", "Impossible", "Rocket better", "Moon cable"] },
        { t: "Teleportation?", opts: ["Quantum", "Matter", "Death machine", "Convenient"] },
        { t: "Invisibility?", opts: ["Metamaterials", "Light bending", "Cameras", "Magic"] },
        { t: "Cloning?", opts: ["Organs", "Pets", "Humans", "Unethical"] },
        { t: "De-extinction (Mammoth)?", opts: ["Cool", "Dangerous", "Ecology risk", "Zoo attraction"] },
        { t: "Lab grown meat?", opts: ["Future", "Yuck", "Expensive", "Vegan"] },
        { t: "Vertical farming?", opts: ["Efficient", "Energy heavy", "Urban", "Future food"] },
        { t: "Desalination?", opts: ["Water solution", "Brine waste", "Expensive", "Energy intense"] },
        { t: "Carbon capture?", opts: ["Band-aid", "Solution", "Trees better", "Tech fix"] },
        { t: "Geoengineering?", opts: ["Save earth", "Risk side effects", "Last resort", "Weather control"] },
        { t: "Biosphere 3?", opts: ["Mars practice", "Failure", "Possible", "Need Earth"] },
        { t: "Cyborgs?", opts: ["Evolution", "Medical only", "Neuralink", "Scary"] },
        { t: "Brain upload?", opts: ["Immortality", "Copy", "Impossible", "Year 2100"] },
        { t: "Cryonics?", opts: ["Hope", "Pseudoscience", "For rich", "Freeze"] },
        { t: "Telescopes?", opts: ["James Webb", "Hubble", "Ground based", "Radio"] },
        { t: "Moon base?", opts: ["Coming soon", "Gateway", "Mining", "Tourist trap"] },
        { t: "Space Force?", opts: ["Defense", "Militarization", "Sci-fi", "Necessary"] },
        { t: "UFOs/UAPs?", opts: ["Aliens", "Drones", "Spy tech", "Illusion"] },
        { t: "Flat Earth?", opts: ["Lol", "Conspiracy", "Why?", "Perspective"] },
        { t: "Antarctica secrets?", opts: ["Ice", "Aliens", "Pyramids", "Climate data"] },
        { t: "Volcano power?", opts: ["Geothermal", "Dangerous", "Unlimited", "ICeland"] },
        { t: "Earthquake prediction?", opts: ["Animals", "AI", "Random", "Plate tech"] },
        { t: "Tornado chasing?", opts: ["Science", "Adrenaline", "Stupid", "Data"] },
        { t: "Lightning energy?", opts: ["Harvest", "Too fast", "Storage issue", "Cool"] },
        { t: "Tesla wireless power?", opts: ["Visionary", "Inefficient", "Dangerous", "Free energy"] },
        { t: "Perpetual motion?", opts: ["Impossible", "Magnets", "Thermodynamics", "Fake"] },
        { t: "Alchemy?", opts: ["Chemistry origin", "Gold", "Magic", "Transmutation"] }
    ],
    'General': [] // Will be populated dynamically
};

async function seed() {
    try {
        console.log("🌱 Seeding database with massive dataset...");

        // Disable FK checks and Clear data
        await db.query("SET FOREIGN_KEY_CHECKS = 0");
        await db.query("DELETE FROM responses");
        await db.query("DELETE FROM options");
        await db.query("DELETE FROM question_categories");
        await db.query("DELETE FROM questions");
        await db.query("DELETE FROM user_preferences");

        // Keep existing users if possible, or recreate
        // For 'General' category logic, we will pick 10 questions from each of the other 5 categories
        // and add them to the General list as well, making it a mix.
        // Actually, let's make separate copies so they are unique entries but same content.

        const otherCats = ['Technology', 'Health', 'Finance', 'Sports', 'Science'];
        for (const c of otherCats) {
            // Pick 10 random questions from each category to add to General
            const questions = TEMPLATES[c];
            const shuffled = questions.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 10);
            TEMPLATES['General'].push(...selected);
        }
        // Shuffle General
        TEMPLATES['General'].sort(() => 0.5 - Math.random());

        console.log(`General category size: ${TEMPLATES['General'].length}`);

        await db.query("DELETE FROM users WHERE username != 'testuser'");
        await db.query("SET FOREIGN_KEY_CHECKS = 1");

        const hash = await bcrypt.hash('password', 10);

        // Users
        const userIds = [];
        const [testCheck] = await db.query("SELECT user_id FROM users WHERE username = 'testuser'");
        if (testCheck.length > 0) {
            userIds.push(testCheck[0].user_id);
        } else {
            const [resTest] = await db.query("INSERT INTO users (username, password_hash) VALUES (?, ?)", ['testuser', hash]);
            userIds.push(resTest.insertId);
        }

        for (const name of NAMES) {
            const [res] = await db.query("INSERT INTO users (username, password_hash) VALUES (?, ?)", [name, hash]);
            userIds.push(res.insertId);
        }
        console.log(`✅ Created ${userIds.length} users`);

        // DELETE ALL CATEGORIES and create fresh ones
        await db.query("DELETE FROM categories");
        console.log("✅ Deleted all categories");

        // Create fresh categories in specific order
        const catOrder = ['Technology', 'Health', 'Finance', 'Sports', 'General', 'Science'];
        const catMap = {};
        for (const c of catOrder) {
            const [ins] = await db.query("INSERT INTO categories (name) VALUES (?)", [c]);
            catMap[c] = ins.insertId;
        }
        console.log(`✅ Categories created with IDs:`, catMap);

        // Create Questions using ordered category list
        let totalQ = 0;
        for (const cat of catOrder) {
            const tmpls = TEMPLATES[cat];
            console.log(`📝 Creating ${tmpls.length} questions for ${cat}...`);

            for (const tmpl of tmpls) {
                const uId = userIds[Math.floor(Math.random() * userIds.length)];
                const title = tmpl.t;
                const options = tmpl.opts;

                const isAnon = Math.random() > 0.9;
                const commentsEnabled = Math.random() > 0.2;

                const [qRes] = await db.query(
                    "INSERT INTO questions (user_id, title, description, is_anonymous, comments_enabled) VALUES (?, ?, ?, ?, ?)",
                    [uId, title, `Discussion about: ${title}`, isAnon, commentsEnabled]
                );
                const qId = qRes.insertId;
                totalQ++;

                await db.query("INSERT INTO question_categories (question_id, category_id) VALUES (?, ?)", [qId, catMap[cat]]);

                const optionIds = [];
                for (const o of options) {
                    const [optRes] = await db.query("INSERT INTO options (question_id, option_text) VALUES (?, ?)", [qId, o]);
                    optionIds.push(optRes.insertId);
                }

                // Responses
                const numResponses = Math.floor(Math.random() * 12); // up to 12 responses
                const usedUsers = new Set();

                for (let k = 0; k < numResponses; k++) {
                    let rUser;
                    let attempts = 0;
                    do {
                        rUser = userIds[Math.floor(Math.random() * userIds.length)];
                        attempts++;
                    } while (usedUsers.has(rUser) && attempts < 20);

                    if (usedUsers.has(rUser)) continue;
                    usedUsers.add(rUser);

                    const rOpt = optionIds[Math.floor(Math.random() * optionIds.length)];
                    const comment = Math.random() > 0.85 ? "Interesting topic!" : null;

                    try {
                        await db.query(
                            "INSERT INTO responses (question_id, user_id, option_id, comment_text) VALUES (?, ?, ?, ?)",
                            [qId, rUser, rOpt, comment]
                        );
                    } catch (e) { }
                }
            }
        }

        // Reset testuser prefs
        await db.query("DELETE FROM user_preferences WHERE user_id = ?", [userIds[0]]);

        console.log(`\n✅ Seeding complete! ${totalQ} questions created.`);

    } catch (err) {
        console.error("❌ Seeding error:", err);
    } finally {
        process.exit();
    }
}

seed();
