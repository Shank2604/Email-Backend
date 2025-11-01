const SibApiV3Sdk = require("@getbrevo/brevo");
const Campaign = require("../models/Campaign");
const { buildEmailHTML } = require("../utils/buildEmailHTML"); // see earlier
/*
// brevoClient.setApiKey(
//   SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
//   process.env.BREVO_API_KEY
// );
*/

const brevoClient = SibApiV3Sdk.ApiClient.instance;
const brevo_api_key = brevoClient.authentications['api-key'];
brevo_api_key.apiKey = process.env.BREVO_API_KEY;

const brevoInstance = new SibApiV3Sdk.TransactionalEmailsApi();

exports.createAndSendCampaign = async (req, res) => {
  try {
    // If using multer, fields will be in req.body (strings)
    // Try to parse blocks whether sent as JSON string or real object
    let { title, subject, recipients, blocks, content } = req.body;

    console.log("Incoming req.body:", req.body);
    // If blocks arrived as JSON string, parse it
    if (typeof blocks === "string") {
      try {
        blocks = JSON.parse(blocks);
      } catch (err) {
        console.warn("blocks parse failed, value:", blocks);
        blocks = undefined;
      }
    }

    // Normalize recipients: could be array or comma-separated string
    let recipientList = [];
    if (Array.isArray(recipients)) recipientList = recipients;
    else if (typeof recipients === "string" && recipients.trim().length)
      recipientList = recipients.split(",").map((r) => r.trim()).filter(Boolean);

    // If no blocks provided, but content string is provided, wrap as a text block
    if ((!Array.isArray(blocks) || blocks.length === 0) && content) {
      blocks = [{ type: "text", content: String(content) }];
    }

    // Ensure required fields
    if (!recipientList.length) {
      return res.status(400).json({ message: "No recipients provided" });
    }
    if (!subject || !blocks || !Array.isArray(blocks) || !blocks.length) {
      return res.status(400).json({ message: "Missing subject or blocks" });
    }

    // Sanitize blocks: ensure fields exist and are strings (no undefined)
    const sanitizedBlocks = blocks.map((b) => {
      const type = b.type || "text";
      return {
        type,
        content: type === "text" ? String(b.content || "") : undefined,
        url: type === "image" ? String(b.url || "") : undefined,
        text: type === "button" ? String(b.text || "") : undefined,
        link: type === "button" ? String(b.link || "") : undefined,
      };
    });

    // Build HTML
    const emailHtmlRaw = buildEmailHTML(sanitizedBlocks, title || "");
    // final safety: remove any accidental literal "undefined"
    const emailHtml = String(emailHtmlRaw).replace(/undefined/g, "");

    console.log("Final email HTML (preview):\n", emailHtml.slice(0, 1000));

    // Save campaign document
    const campaign = new Campaign({
      title: title || "Untitled",
      subject,
      recipients: recipientList,
      blocks: sanitizedBlocks,
      status: recipientList.map((email) => ({ email })),
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
        // Optionally update delivered per recipient here
        console.log(`Sent to ${email}`);
      } catch (err) {
        console.error(`Send error for ${email}:`, err && err.message ? err.message : err);
      }
    }

    // Mark as sent & update status
    campaign.status = campaign.status.map((s) => ({ ...s, delivered: true, lastSent: new Date() }));
    campaign.campaignStatus = "sent";
    await campaign.save();

    return res.json({ success: true, campaign });
  } catch (err) {
    console.error("createAndSendCampaign error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};
