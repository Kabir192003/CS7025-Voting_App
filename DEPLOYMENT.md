# Grading Evaluation Setup Guide

This document provides crystal clear, step-by-step instructions to run this full-stack application natively on your local machine for grading purposes.

---

## 🛑 Prerequisite: Database Connection
The backend server utilizes a centralized, remote **Aiven MySQL Cloud Database**. 
You **do not** need to install MySQL, configure relational tables, or inject dummy data on your computer! Everything is hosted live in the cloud and your local server will simply fetch it over Wi-Fi.

---

## Step 1: Install Dependencies
Open your terminal, navigate to the root folder of this extracted project, and install all required Node.js backend packages:
```bash
npm install
```

## Step 2: Configure Environment Variables
Inside the root directory of this project, you will find a file named `.env.example`. 
Simply **rename** this file to `.env`. 

*(Alternatively, you can manually create a new file named `.env` and paste the following active credentials inside it):*

```text
DB_HOST=thisorthat2026-thisorthat2026.f.aivencloud.com
DB_PORT=23286
DB_USER=avnadmin
DB_PASSWORD=[PASTE_AIVEN_PASSWORD_HERE]
DB_NAME=defaultdb
DB_SSL=true
JWT_SECRET=supersecretassignmentkey
PORT=4000
```

## Step 3: Start the Server
With the database variables mapped, start the Backend Express server by running:
```bash
npm start
```

If successful, your terminal will respond with: `server up on port 4000`.

## Step 4: Access the Dynamic Web Application
Open your preferred web browser and navigate to the application portal:

👉 **http://localhost:4000**

You will instantly have access to hundreds of pre-populated template questions, custom options, and detailed user interaction histories pulled natively from the cloud database! Enjoy exploring the smart, personalized feeds.
