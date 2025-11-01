// controllers/campaignController.js
const Campaign = require("../models/Campaign");
const Notification = require("../models/Notification");
const { buildEmailHTML } = require("../utils/buildEmailHTML");
const SibApiV3Sdk = require("sib-api-v3-sdk").default;


// const SibApiV3Sdk = require("@sendinblue/client");

// Initialize Brevo client
/*
const brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
brevoClient.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);
*/

try{
  const brevoClient = SibApiV3Sdk.ApiClient.instance;
  const brevo_api_key = brevoClient.authentications['api-key'];
  brevo_api_key.apiKey = process.env.BREVO_API_KEY;

  const brevoInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  console.log("Brevo client configured successfully!");
}catch(err){
  console.error("Error configuring Brevo client:", err);
}

exports.createAndSendCampaign = async (req, res, io) => {
  try {
    let { title, subject, recipients, blocks } = req.body;

    // Parse blocks if sent as string
    if (typeof blocks === "string") {
      try {
        blocks = JSON.parse(blocks);
      } catch (e) {
        return res.status(400).json({ message: "Invalid blocks JSON" });
      }
    }

    if (!Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ message: "No valid blocks found" });
    }

    // Clean recipients
    const recipientList = Array.isArray(recipients)
      ? recipients
      : recipients.split(",").map((r) => r.trim());

    // Build HTML from template blocks
    const emailHtml = buildEmailHTML(blocks, title);

    // Save campaign in DB
    const campaign = new Campaign({
      title,
      subject,
      content: emailHtml,
      recipients: recipientList,
      status: recipientList.map((email) => ({
        email,
        delivered: false,
        opened: false,
        lastSent: new Date(),
      })),
      createdBy: req.user?._id || null,
    });

    await campaign.save();

    // Send emails via Brevo
    for (const email of recipientList) {
      try {
        await brevoInstance.sendTransacEmail({
          sender: { name: "TheBanarasShow", email: process.env.BREVO_FROM },
          to: [{ email }],
          subject,
          htmlContent: emailHtml,
        });
        console.log(`📤 Sent email to ${email}`);
      } catch (err) {
        console.error(`❌ Brevo failed for ${email}:`, err.message);
      }
    }

    // Update delivery status
    campaign.status = campaign.status.map((s) => ({ ...s, delivered: true }));
    campaign.campaignStatus = "sent";
    await campaign.save();

    // Notify via socket
    const notification = new Notification({
      message: `Campaign "${title}" sent successfully!`,
      type: "success",
    });
    await notification.save();
    io.emit("new-notification", notification);

    res.json({ success: true, campaign });
  } catch (error) {
    console.error("❌ Campaign creation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
