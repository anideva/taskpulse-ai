const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getTeamTasks,
  createTeamTask,
  updateTeamTask,
  deleteTeamTask,
  getTeamActivities,
  getTeamMessages,
  postTeamMessage,
  getTeamMembers,
} = require("../controllers/teamController");

const router = express.Router();

router.get("/tasks", protect, getTeamTasks);
router.post("/tasks", protect, createTeamTask);
router.put("/tasks/:id", protect, updateTeamTask);
router.delete("/tasks/:id", protect, deleteTeamTask);

router.get("/activity", protect, getTeamActivities);
router.get("/messages", protect, getTeamMessages);
router.post("/messages", protect, postTeamMessage);
router.get("/members", protect, getTeamMembers);

module.exports = router;
