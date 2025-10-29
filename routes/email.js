const express = require("express");
const router = express.Router();
const { sendCampaign } = require("../controllers/emailController");
const { brevoWebhook } = require("../controllers/webhookController");

router.post("/send", sendCampaign);  // create a campaign
router.post("/webhook", brevoWebhook); // Brevo will post events here

module.exports = router;
