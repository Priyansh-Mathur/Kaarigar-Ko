// Payment provider abstraction (mirrors src/payments/providers/*). Razorpay when
// RAZORPAY_KEY_ID is set, otherwise the dev mock.
const { randomUUID, createHmac } = require('crypto');

const mock = {
  name: 'mock',
  async createOrder() {
    return { providerOrderId: `order_mock_${randomUUID().replace(/-/g, '').slice(0, 16)}` };
  },
  verifySignature() {
    return true; // mock-pay endpoint is the trusted trigger in dev
  },
};

const razorpay = {
  name: 'razorpay',
  async createOrder(input) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: input.amountPaise, currency: input.currency, receipt: input.receipt }),
    });
    if (!res.ok) throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { providerOrderId: data.id };
  },
  verifySignature(rawBody, signature) {
    if (!rawBody || !signature) return false;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return expected === signature;
  },
};

module.exports = process.env.RAZORPAY_KEY_ID ? razorpay : mock;
