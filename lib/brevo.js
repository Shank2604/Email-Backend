import axios from 'axios';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const API_BASE = 'https://api.brevo.com/v3';

export async function sendBatchTransactional(messages) {
  // messages: array of message objects formatted as Brevo expects
  // For bulk you can include `messageVersions` or send up to 1000 messages per request
  return axios.post(`${API_BASE}/smtp/email`, {
    // example single-message structure when sending many, adapt to Brevo docs
    // For multiple tailored messages, use `messageVersions` param. See docs.
    messageVersions: messages
  }, {
    headers: {
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json'
    }
  });
}
