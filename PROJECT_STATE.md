# Decision Support System - Final State

**Last Updated**: January 31, 2026

## 📊 Project Statistics

- **Total Users**: 56 (including testuser + 55 generated users)
- **Total Questions**: 300 (50 per category)
- **Total Responses**: 1,742
- **Categories**: 6 (Technology, Health, Finance, Sports, General, Science)

## 🗄️ Database Structure

### Categories (IDs 52-57)
- **Technology** (ID: 52): 50 programming/development questions
- **Health** (ID: 53): 50 diet/nutrition/food questions
- **Finance** (ID: 54): 50 investment/money questions
- **Sports** (ID: 55): 50 sports/athletics questions
- **General** (ID: 56): 50 mixed questions from all categories
- **Science** (ID: 57): 50 space/physics/chemistry questions

### Core Features
- ✅ Duplicate vote prevention (UNIQUE constraint on responses table)
- ✅ Anonymous posting support
- ✅ Comment support toggle per question
- ✅ User preferences for personalized feed
- ✅ Multiple feed types (Personalized, Trending, Unanswered)

## 🔐 Authentication

- **Test Account**: 
  - Username: `testuser`
  - Password: `password`

- **JWT-based authentication**
- **bcrypt password hashing**

## 📁 Project Structure

```
decision-support/
├── config/
│   └── db.js                 # MySQL connection pool
├── controllers/
│   ├── authController.js     # Login/signup
│   ├── preferenceController.js # User preferences
│   ├── questionController.js # Q&A management
│   ├── responseController.js # Vote/response handling
│   ├── userController.js     # User profile
│   └── homeController.js     # Feed logic
├── routes/
│   ├── authRoutes.js
│   ├── preferenceRoutes.js
│   ├── questionRoutes.js
│   ├── responseRoutes.js
│   ├── userRoutes.js
│   └── homeRoutes.js
├── public/
│   ├── index.html           # Landing page
│   ├── home.html            # Main feed
│   ├── question.html        # Question details
│   ├── ask.html             # Create question
│   ├── profile.html         # User profile
│   ├── app.js               # Frontend logic
│   └── style.css            # Styles
├── scripts/
│   ├── seed_data.js         # Main seeding script (USE THIS)
│   ├── db_stats.js          # View database statistics
│   ├── view_users.js        # View all users
│   └── add_unique_constraint.js # Add duplicate vote prevention
├── server.js                # Express server
├── .env                     # Environment variables
├── database_backup_final.sql # Full database backup
└── package.json
```

## 🚀 Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create `.env` file with:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=decision_support
JWT_SECRET=your_secret_key
PORT=4000
```

### 3. Seed Database
```bash
node scripts/seed_data.js
```

### 4. Start Server
```bash
node server.js
```

### 5. Access Application
Open browser to: `http://localhost:4000`

## 📝 Key User Flows

### New User Flow
1. Sign up → Automatic login
2. Preference modal appears immediately
3. Select 1+ categories
4. Redirected to personalized feed

### Voting Flow
1. View question details
2. Select option
3. Submit vote → "✅ Response submitted!" alert
4. Page reloads
5. Vote is highlighted, form disabled
6. "✅ You have already voted" message shown

### Feed Types
- **Personalized (For You)**: Questions from selected categories
- **Trending**: Sorted by response count (descending)
- **Unanswered**: Sorted by response count (ascending)

## 🔧 Database Backup & Restore

### Create Backup
```bash
mysqldump -u root -p decision_support > backup.sql
```

### Restore from Backup
```bash
mysql -u root -p decision_support < database_backup_final.sql
```

## 📊 Database Statistics

Run anytime to check current state:
```bash
node scripts/db_stats.js
```

Output shows:
- Total users, questions, responses, categories
- Questions per category breakdown
- Top 5 most active questions
- Unique constraint status

## 🎯 Frontend Category IDs

**IMPORTANT**: Update `public/app.js` CATEGORIES array if database is reseeded:

```javascript
const CATEGORIES = [
    { id: 52, name: 'Technology' },
    { id: 53, name: 'Health' },
    { id: 54, name: 'Finance' },
    { id: 55, name: 'Sports' },
    { id: 56, name: 'General' },
    { id: 57, name: 'Science' }
];
```

## 🐛 Common Issues & Fixes

### "Categories not showing"
- Run `node scripts/db_stats.js` to check category IDs
- Update CATEGORIES array in `public/app.js` with correct IDs
- Restart server

### "Vote not submitting"
- Check console for errors
- Ensure `submitVote()` function exists in `app.js`
- Verify user is logged in

### "Only one category in feed"
- Verify user preferences are saved (check user_preferences table)
- Check homeController.js query includes IN (?) for multiple categories
- Ensure CATEGORIES array has correct IDs

## 📦 Deployment Ready

All files committed to git:
```bash
git log --oneline
```

Latest commit: "Complete Decision Support System: 300 questions, 6 categories, vote system with duplicate prevention, preference-based feed"

## 🎉 Project Features Completed

- ✅ User authentication (signup/login)
- ✅ User preferences system
- ✅ 300 real questions across 6 categories
- ✅ Multiple feed types (Personalized, Trending, Unanswered)
- ✅ Question creation with category tagging
- ✅ Vote/response system
- ✅ Duplicate vote prevention
- ✅ Anonymous posting
- ✅ Comment support toggle
- ✅ Response count badges
- ✅ Vote state persistence
- ✅ User profile with "My Answers" section
- ✅ Modern, responsive UI
- ✅ Database backup created

## 🔄 Next Steps (Optional Enhancements)

- Deploy to Railway/Render/Heroku
- Add search functionality
- Implement notifications
- Add vote analytics/charts
- Social sharing features
- Mobile app
- Admin dashboard
