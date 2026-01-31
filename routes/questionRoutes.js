const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");
const authenticateToken = require("../middleware/authMiddleware");

// Create a new question
router.post("/", authenticateToken, questionController.createQuestion);

// Get a specific question
router.get("/:id", authenticateToken, questionController.getQuestionById);

module.exports = router;
