const mongoose = require("mongoose");

const StatusSchema = new mongoose.Schema({
  email: { type: String, required: true },
  delivered: { type: Boolean, default: false },
  opened: { type: Boolean, default: false },
  lastSent: { type: Date, default: Date.now },
});

const BlockSchema = new mongoose.Schema({
  type: { type: String, enum: ["text", "image", "button"], required: true },
  content: { type: String }, // for text
  url: { type: String }, // for image
  text: { type: String }, // for button
  link: { type: String }, // for button
});

const CampaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    recipients: [{ type: String, required: true }],
    blocks: [BlockSchema], // template structure
    status: [StatusSchema],
    imageUrl: { type: String },
    link: { type: String },
    gapDays: { type: Number, default: 3 },
    maxResends: { type: Number, default: 2 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", CampaignSchema);