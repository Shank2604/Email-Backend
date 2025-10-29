// models/Recipient.js
import mongoose from 'mongoose';
const RecipientSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  email: { type: String, required: true, index: true },
  attributes: Object,
  status: { type: String, enum: ['pending','sent','delivered','opened','bounced','blocked','complained'], default: 'pending' },
  opened: { type: Boolean, default: false },
  lastSentAt: Date,
  resendCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.models.Recipient || mongoose.model('Recipient', RecipientSchema);