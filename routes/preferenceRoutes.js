const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const preferenceController = require("../controllers/preferenceController");

router.post("/", authMiddleware, preferenceController.savePreferences);

module.exports = router;


