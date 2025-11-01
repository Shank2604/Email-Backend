const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const morgan = require("morgan");
const templateRoutes = require("./routes/templateRoutes.js");
const { buildEmailHTML } = require("./utils/buildEmailHTML.js");
const { createAndSendCampaign } = require("./controller/sendCampaignController.js");


const authRoutes = require("./routes/auth.js");
const { authMiddleware, adminMiddleware } = require("./middleware/auth.js");

const User = require("./models/User");
const Campaign = require("./models/Campaign.js");
const Notification = require("./models/Notification.js");

// ✅ Brevo setup
// const SibApiV3Sdk = require("@sendinblue/client");
// const brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
// brevoClient.setApiKey(
//   SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
//   process.env.BREVO_API_KEY
// );
const SibApiV3Sdk = require("sib-api-v3-sdk").default;

try{
  const brevoClient = SibApiV3Sdk.ApiClient.instance;
  const brevo_api_key = brevoClient.authentications['api-key'];
  brevo_api_key.apiKey = process.env.BREVO_API_KEY;

  const brevoInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  console.log("Brevo client configured successfully!");
}catch(err){
  console.error("Error configuring Brevo client:", err);
}



const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Ensure uploads folder exists
// const uploadDir = path.join(__dirname, "uploads");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir);
// }

// // ✅ File upload setup (Multer)
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) =>
//     cb(null, Date.now() + path.extname(file.originalname)),
// });
// const upload = multer({ storage });

// ✅ Socket.io setup
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("🔌 New client connected");
});

// ✅ Routes
app.use("/api/auth", authRoutes);

app.use("/api/templates", templateRoutes);

// Send Emails (with template blocks)
app.post(
  "/api/campaigns",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  (req, res) => createAndSendCampaign(req, res, io)
);

// ✅ Get all campaigns (detailed)
app.get("/api/campaigns", authMiddleware, async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    res.json(campaigns);
  } catch (err) {
    console.error("Error fetching campaigns:", err.message);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// ✅ Webhook for open/delivered tracking
app.post("/api/brevo/webhook", async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    for (const event of events) {
      const { email, event: eventType } = event;
      await Campaign.updateMany(
        { "status.email": email },
        {
          $set: {
            "status.$.delivered": eventType === "delivered",
            "status.$.opened": eventType === "opened",
          },
        }
      );
    }
    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).send("Error");
  }
});

// ✅ Notifications route
app.get("/api/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error("Notifications fetch error:", err.message);
    res.status(500).send("Error fetching notifications");
  }
});

// ✅ Cron job — resend unopened emails after a delay
cron.schedule("0 * * * *", async () => {
  console.log("⏰ Running hourly resend job...");
  const campaigns = await Campaign.find();

  for (const campaign of campaigns) {
    for (const status of campaign.status) {
      const resendGap =
        parseInt(process.env.RESEND_GAP_HOURS || "24", 10) * 60 * 60 * 1000;
      if (!status.opened && new Date() - status.lastSent > resendGap) {
        try {
          await brevoInstance.sendTransacEmail({
            sender: { name: "TheBanarasShow", email: process.env.BREVO_FROM },
            to: [{ email: status.email }],
            subject: campaign.subject,
            htmlContent: campaign.content,
          });
          status.lastSent = new Date();
          console.log(`🔁 Resent email to ${status.email}`);
        } catch (err) {
          console.error(`Resend failed for ${status.email}:`, err.message);
        }
      }
    }
    await campaign.save();
  }
});

// ✅ Auto-clean notifications older than 1 day
cron.schedule("0 0 * * *", async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await Notification.deleteMany({ createdAt: { $lt: oneDayAgo } });
  console.log("🧹 Deleted notifications older than 24h");
});

// ✅ Connect MongoDB and Start Server
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME })
  .then(() => {
    console.log("✅ MongoDB Connected");
    server.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => console.error(err));
