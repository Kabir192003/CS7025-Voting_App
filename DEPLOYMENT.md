# Grading Evaluation Setup Guide

This document provides crystal clear, step-by-step instructions to run this full-stack application natively on your local machine for grading purposes.

---

## Prerequisite: Database Connection
The backend server utilizes a centralized, remote **Aiven MySQL Cloud Database**. 
You **do not** need to install MySQL, configure relational tables, or inject dummy data on your computer! Everything is hosted live in the cloud and your local server will simply fetch it over Wi-Fi.

---

## Step 1: Install Dependencies
Open your terminal, navigate to the root folder of this extracted project, and install all required Node.js backend packages:
```bash
npm install
```

## Step 2: (Optional) Configure Environment
By default, the backend code is seamlessly pre-configured to connect to the cloud database automatically with zero configuration. However, if you were explicitly provided an accompanying `.env` file containing manual database override credentials in your university submission portal, you may place that `.env` file directly into the root folder of this project now.

## Step 3: Start the Server
Start the Backend Express server by running:
```bash
npm start
```

If successful, your terminal will respond with: `server up on port 4000`.

## Step 3: Access the Dynamic Web Application
Open your preferred web browser and navigate to the application portal:

**http://localhost:4000**

*(Note: The server is already hardcoded to connect seamlessly to the live remote Aiven Database, so you will instantly have access to hundreds of pre-populated template questions, custom options, and detailed user interaction histories pulled natively from the cloud database!)*
