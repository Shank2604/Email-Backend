// jobs/resendNotOpened.js
import cron from 'node-cron';
import Recipient from '../models/Recipient.js';
import { sendBatchTransactional } from '../lib/brevo';
import Campaign from '../models/Campaign.js';

cron.schedule('0 * * * *', async () => { // every hour (adjust as needed)
  const now = new Date();
  // find recipients that were last sent > gapDays and not opened
  const recips = await Recipient.find({
    opened: false,
    status: { $in: ['sent','delivered'] },
    resendCount: { $lt: 3 } // default max — update per campaign
  }).populate('campaign');

  for (const r of recips) {
    const gapDays = r.campaign?.gapDays ?? 3;
    const nextEligible = new Date((r.lastSentAt || 0).getTime() + gapDays*24*60*60*1000);
    if (now >= nextEligible && r.resendCount < (r.campaign.maxResends ?? 2)) {
      // prepare message
      const msg = {
        to: [{ email: r.email }],
        subject: r.campaign.subject,
        htmlContent: /* render template with r.attributes */ `<p>Hi</p>`,
        sender: { name: 'My App', email: 'no-reply@yourdomain.com' }
      };
      try {
        await sendBatchTransactional([ { ...msg } ]);
        r.lastSentAt = new Date();
        r.resendCount += 1;
        r.status = 'sent';
        await r.save();
      } catch (err) {
        console.error('Resend failed for', r.email, err.response?.data || err.message);
      }
    }
  }
});
