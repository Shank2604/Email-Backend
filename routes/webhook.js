// routes/webhook.js
import express from 'express';
import Recipient from '../models/Recipient';
import EventLog from '../models/EventLog';
const router = express.Router();

router.post('/brevo', async (req, res) => {
  // optional: verify webhook header/secret if you set one in Brevo settings
  const events = req.body; // Brevo may send an array of events
  // Example event object: { "email": "a@b.com", "event": "Opened", "date": 1234567890, ... }
  try {
    for (const ev of events) {
      const email = ev.email || ev.msg?.to; // adapt to actual payload
      const eventType = ev.event || ev.eventName || ev.type; // adapt
      // Log raw event
      await EventLog.create({
        recipientEmail: email,
        eventType,
        payload: ev,
        campaign: ev.campaignId || null
      });

      // Update recipient status
      const r = await Recipient.findOne({ email, campaign: ev.campaignId });
      if (r) {
        if (eventType === 'Opened' || eventType === 'Open') {
          r.opened = true;
          r.status = 'opened';
          await r.save();
        } else if (eventType === 'Delivered' || eventType === 'Received') {
          r.status = 'delivered';
          await r.save();
        } else if (eventType === 'Soft Bounce' || eventType === 'Hard Bounce' || eventType === 'Bounced') {
          r.status = 'bounced';
          await r.save();
        } else if (eventType === 'Sent') {
          r.status = 'sent';
          await r.save();
        }
      }
    }
    res.status(200).send('ok');
  } catch (err) {
    console.error(err);
    res.status(500).send('error');
  }
});

export default router;
