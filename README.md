#  This Or That 

**🌍 Live Demo:** [https://cs7025-this-or-that.onrender.com/login.html](https://cs7025-this-or-that.onrender.com/login.html)

An advanced, full-stack decision-support platform designed to surface highly personalized content to users. This platform goes beyond typical web frameworks by embedding smart categorization, real-time single-vote constraints, detailed user interaction metrics, and algorithmic feed personalization.

##  Key Features (Rubric Objectives)

*   **Algorithmic Personalization:** Home feeds are dynamically generated based on the user's category preferences (`user_preferences` table) and voting history. The algorithm prioritizes highly relevant, trending, and uniquely unanswered questions for each visitor.
*   **Centralised Data Storage:** A robust, fully normalized `MySQL` relational database powers the entire platform. Secured efficiently via Node.js connection pooling and strict relational architecture (`schema.sql`).
*   **Strict Input Sanitisation:** Implemented a global intercept utility (`utils/sanitize.js`) to rigorously clean all User Generated Content (UGC), successfully preempting HTML/XSS script injections before database storage.
*   **Architectural Abstraction:** Highly modular codebase setup. Routing interfaces (`routes/`), core business logic (`controllers/`), remote database configurations (`config/db.js`), and frontend assets are functionally isolated.
*   **Security & Stability:** Secured using cross-session JWT tokens (`authMiddleware.js`), password hashing via `Bcrypt`, parametric SQL variables (to thwart SQL injections), and global exception guards preventing catastrophic server crashes.

## 🛠 Technology Stack

*   **Frontend Endpoints:** Vanilla HTML5, CSS3, Client-side JavaScript (DOM Manipulation via DOM APIs)
*   **Backend Engineering:** Node.js, Express.js Web Framework
*   **Database Instance:** Remote Aiven Cloud MySQL Sandbox
*   **Security Tools:** JSON Web Tokens (JWT), bcrypt, helmet-friendly headers

##  Local Setup & Configuration

Please refer to the comprehensive **[DEPLOYMENT.md](./DEPLOYMENT.md)** guide inside this repository. 

It contains step-by-step documentation for installing necessary node modules via `npm install`, correctly spinning up the server locally, and assigning the requisite Aiven `.env` variables required to connect to the external live database instance for final evaluation.

## 🗄️ Database Architecture

A detailed breakdown of the `MySQL` entity-relationship schema layout is available directly inside **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)**. 

If tasked with evaluating the data logic offline independently of the active Aiven cloud service, you may natively run `node scripts/seed_data.js` to locally reconstruct the database and populate the server with hundreds of algorithmic benchmark scenarios.
