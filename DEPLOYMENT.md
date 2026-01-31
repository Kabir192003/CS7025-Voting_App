# Decision Support System - Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- [x] Working Node.js application (localhost:4000)
- [x] MySQL database with schema and data
- [ ] GitHub repository (recommended)
- [ ] Production environment variables

## Deployment Options

### Option 1: Railway (Recommended - Easiest) ⚡

**Why Railway?**
- Free tier available
- Automatic MySQL database provisioning
- Simple deployment from GitHub
- Built-in environment variables

**Steps:**

1. **Prepare Your Code**
```bash
# Add to .gitignore
echo "node_modules/" >> .gitignore
echo ".env" >> .gitignore
echo ".DS_Store" >> .gitignore

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"
```

2. **Create GitHub Repository**
```bash
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/decision-support.git
git branch -M main
git push -u origin main
```

3. **Deploy on Railway**
- Go to [railway.app](https://railway.app)
- Sign in with GitHub
- Click "New Project" → "Deploy from GitHub repo"
- Select your `decision-support` repository
- Railway auto-detects Node.js and runs `npm start`

4. **Add MySQL Database**
- In your Railway project, click "+ New"
- Select "Database" → "Add MySQL"
- Railway will auto-provision a database

5. **Set Environment Variables**
- Go to your Node.js service → Variables
- Add:
  ```
  DB_HOST=<from MySQL service>
  DB_USER=root
  DB_PASSWORD=<from MySQL service>
  DB_NAME=railway
  JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
  PORT=4000
  ```

6. **Run Database Schema**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run node scripts/create_tables.js
railway run node scripts/seed_data.js
```

---

### Option 2: Render (Great Alternative) 🚀

**Why Render?**
- Free tier with persistent database
- Easy MySQL setup
- Auto-deploy from GitHub

**Steps:**

1. **Sign up at [render.com](https://render.com)**

2. **Create Web Service**
- New → Web Service
- Connect GitHub repository
- Settings:
  - **Name**: decision-support
  - **Environment**: Node
  - **Build Command**: `npm install`
  - **Start Command**: `node server.js`

3. **Create PostgreSQL Database** (Render free tier only supports PostgreSQL)
   
   **Important:** You'll need to convert from MySQL to PostgreSQL:
   ```bash
   npm install pg
   ```
   
   Update `config/db.js` to use PostgreSQL instead of MySQL.

4. **Set Environment Variables** in Render dashboard

---

### Option 3: Heroku (Traditional Choice) 🔵

**Steps:**

1. **Install Heroku CLI**
```bash
brew install heroku/brew/heroku
heroku login
```

2. **Create Heroku App**
```bash
heroku create decision-support-app
```

3. **Add MySQL Database**
```bash
# Use ClearDB MySQL add-on
heroku addons:create cleardb:ignite

# Get database URL
heroku config:get CLEARDB_DATABASE_URL
```

4. **Configure Environment**
```bash
heroku config:set JWT_SECRET=your-secret-key
heroku config:set NODE_ENV=production
```

5. **Deploy**
```bash
git push heroku main
```

6. **Run Database Setup**
```bash
heroku run node scripts/create_tables.js
heroku run node scripts/seed_data.js
```

---

### Option 4: VPS (DigitalOcean, AWS, etc.) 🖥️

**For More Control:**

1. **Provision Server**
- Create Ubuntu 22.04 droplet/instance
- SSH into server

2. **Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server

# Install PM2 (process manager)
sudo npm install -g pm2
```

3. **Setup MySQL**
```bash
sudo mysql
```
```sql
CREATE DATABASE decision_support;
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON decision_support.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

4. **Clone and Setup App**
```bash
git clone https://github.com/YOUR_USERNAME/decision-support.git
cd decision-support
npm install

# Create .env file
nano .env
```

5. **Run with PM2**
```bash
pm2 start server.js --name decision-support
pm2 startup
pm2 save
```

6. **Setup Nginx (Reverse Proxy)**
```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/decision-support
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/decision-support /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

7. **Setup SSL with Let's Encrypt**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Database Migration Options

### Export Your Local Database
```bash
mysqldump -u root -p decision_support > decision_support_backup.sql
```

### Import to Production
```bash
# Railway
railway run mysql decision_support < decision_support_backup.sql

# Heroku ClearDB
mysql -h <cleardb-host> -u <username> -p <database> < decision_support_backup.sql

# VPS
mysql -u appuser -p decision_support < decision_support_backup.sql
```

---

## Production Checklist

- [ ] Set strong `JWT_SECRET` in production
- [ ] Enable CORS only for your domain
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS (SSL certificate)
- [ ] Set up database backups
- [ ] Configure error logging (e.g., Sentry)
- [ ] Add rate limiting
- [ ] Remove development console.logs
- [ ] Test all features in production
- [ ] Set up monitoring (e.g., UptimeRobot)

---

## Quick Commands Reference

```bash
# Check if app is running
curl https://your-app.com/

# View production logs (Railway)
railway logs

# View production logs (Heroku)
heroku logs --tail

# Restart app (PM2 on VPS)
pm2 restart decision-support

# Database backup
mysqldump -u root -p decision_support > backup_$(date +%Y%m%d).sql
```

---

## Recommended: Railway for Beginners

If you're deploying for the first time, I strongly recommend **Railway**:
1. GitHub integration (auto-deploys on push)
2. Free MySQL database included
3. No credit card required for free tier
4. Simple environment variable management
5. Built-in logs and monitoring

---

## Need Help?

- Railway docs: https://docs.railway.app
- Render docs: https://render.com/docs
- Heroku docs: https://devcenter.heroku.com
- DigitalOcean tutorials: https://www.digitalocean.com/community/tutorials
