const mongoose = require("mongoose");

const teamMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    userName: {
      type: String,
      default: "Team Member",
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    isBlocker: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamMessage", teamMessageSchema);
