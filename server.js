require("dotenv").config();

const express = require("express");
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Import routes
const authRoutes = require("./routes/authRoutes");
const questionRoutes = require("./routes/questionRoutes");
const responseRoutes = require("./routes/responseRoutes");
const userRoutes = require("./routes/userRoutes");
const preferenceRoutes = require("./routes/preferenceRoutes");
const homeRoutes = require("./routes/homeRoutes");


// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/responses", responseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/preferences", preferenceRoutes);
app.use("/api/home", homeRoutes);


// Root test
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Start server on SAFE PORT
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
