const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema({
  type: { type: String, enum: ["text", "image", "button"], required: true },
  content: String,
  url: String,
  text: String,
  link: String,
});

const templateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    blocks: [blockSchema],
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 🔗 linked to user
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", templateSchema);
