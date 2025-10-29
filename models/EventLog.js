// models/EventLog.js (optional)
import mongoose from 'mongoose';
const EventLogSchema = new mongoose.Schema({
  recipientEmail: String,
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  eventType: String, // Sent, Delivered, Opened...
  payload: Object,
  receivedAt: { type: Date, default: Date.now }
});
export default mongoose.models.EventLog || mongoose.model('EventLog', EventLogSchema);