const express = require("express");
const Template = require("../models/Template.js");
const upload = require("../middleware/uploadMiddleware.js");
const path = require("path");
const { authMiddleware } = require("../middleware/auth.js");

const router = express.Router();

// ✅ IMAGE UPLOAD ROUTE
router.post("/upload", authMiddleware, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image uploaded" });

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;
  return res.json({ imageUrl });
});

// ✅ SAVE TEMPLATE (specific to user)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, blocks } = req.body;
    if (!title || !blocks) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const template = new Template({
      title,
      blocks,
      user: req.user.id, // 🔗 link to the authenticated user
    });

    await template.save();
    return res.status(201).json({ message: "Template saved", template });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ✅ GET ALL TEMPLATES (for logged-in user)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const templates = await Template.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    return res.json(templates);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ✅ GET SINGLE TEMPLATE (specific to user)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      user: req.user.id, // ensures user owns the template
    });

    if (!template)
      return res.status(404).json({ message: "Template not found" });
    res.json(template);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
