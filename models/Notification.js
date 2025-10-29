const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  message: String,
  type: { type: String, enum: ["info", "success", "error"], default: "info" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);
