// controllers/webhookController.js
const Campaign = require('../models/campaign');

exports.brevoWebhook = async (req, res) => {
  const events = req.body; // array of events from Brevo

  for (const event of events) {
    const { email, event: eventType } = event;

    await Campaign.updateMany(
      { "status.email": email },
      {
        $set: {
          "status.$.delivered": eventType === "delivered",
          "status.$.opened": eventType === "opened"
        }
      }
    );
  }

  res.status(200).send("OK");
};
