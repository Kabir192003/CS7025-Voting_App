const express = require("express");
const router = express.Router();

const responseController = require("../controllers/responseController");
const authenticateToken = require("../middleware/authMiddleware");

// Submit a response (vote/comment)
router.post("/", authenticateToken, responseController.submitResponse);

// Get responses for a question
router.get("/:questionId", authenticateToken, responseController.getResponses);

module.exports = router;
