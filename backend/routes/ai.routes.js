const express = require("express");
const { generateSubtasks } = require("../controllers/ai.controller");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/generate-subtasks", protect, generateSubtasks);
router.post("/suggest-subtasks", protect, generateSubtasks);

module.exports = router;