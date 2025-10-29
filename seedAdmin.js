const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });

    const existing = await User.findOne({ email: "admin" });
    if (existing) {
      console.log("⚠️ Admin already exists:", existing.email);
      return;
    }

    const hashed = await bcrypt.hash("Admin@1234", 10);
    const admin = new User({
      name: "Admin User",
      email: "admin",
      password: hashed,
      role: "admin",
    });

    await admin.save();
    console.log("✅ Admin created successfully:", admin.email);
  } catch (err) {
    console.error("❌ Error seeding admin:", err.message);
  } finally {
    mongoose.disconnect();
  }
}

seedAdmin();