const mongoose = require("mongoose");

const teamTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Review", "Completed"],
      default: "Pending",
    },
    assignee: {
      name: { type: String, default: "Unassigned" },
      role: { type: String, default: "Fullstack Engineer" },
      avatar: { type: String, default: "UN" },
    },
    dueDate: {
      type: Date,
    },
    subtasks: [
      {
        title: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    creatorName: {
      type: String,
      default: "Team Member",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamTask", teamTaskSchema);
