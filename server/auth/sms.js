// Transactional OTP delivery through MSG91's DLT-approved Flow API.
const env = require('../config/env');
const { HttpError } = require('../lib/envelope');

function msg91Number(phone) {
  // MSG91 expects an E.164 number without the '+' prefix (e.g. 919876543210).
  return phone.replace(/^\+/, '');
}

async function sendOtp(phone, code) {
  if (env.NODE_ENV !== 'production') {
    console.log(`SMS(dev) OTP for ${phone}: ${code}`);
    return;
  }

  if (env.SMS_PROVIDER !== 'msg91' || !env.SMS_PROVIDER_KEY || !env.SMS_MSG91_FLOW_ID) {
    console.warn('OTP generated but not delivered: MSG91 credentials are not configured');
    return;
  }

  const response = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      authkey: env.SMS_PROVIDER_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id: env.SMS_MSG91_FLOW_ID,
      short_url: '0',
      recipients: [{
        mobiles: msg91Number(phone),
        [env.SMS_OTP_VARIABLE]: code,
      }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('MSG91 OTP delivery failed', { status: response.status, body: body.slice(0, 500) });
    throw new HttpError(502, 'Could not send OTP. Please try again shortly.');
  }
}

module.exports = { sendOtp };
