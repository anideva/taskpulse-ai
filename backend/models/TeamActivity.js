const mongoose = require("mongoose");

const teamActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    userName: {
      type: String,
      default: "Team Member",
    },
    action: {
      type: String,
      required: true,
    },
    taskTitle: {
      type: String,
      default: "",
    },
    details: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["create", "status", "priority", "assignee", "message", "delete"],
      default: "status",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamActivity", teamActivitySchema);
