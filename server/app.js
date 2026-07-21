// Express app: CORS, JSON (with raw body captured for webhook HMAC), routers under
// /api/v1, then 404 + error middleware. Routers are mounted as each phase lands.
const express = require('express');
const cors = require('cors');
const { ok } = require('./lib/envelope');
const { corsOptions } = require('./lib/cors');
const errorHandler = require('./middleware/error');

const app = express();

app.use(cors(corsOptions()));
app.use(
  express.json({
    limit: '2mb',
    // Capture the raw body so the payments webhook can verify the HMAC signature.
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// ── /api/v1 ────────────────────────────────────────────────────────────────
const v1 = express.Router();

v1.get('/', (req, res) => res.json(ok({ name: 'KaarigarKo API', version: '0.1.0', status: 'ok' })));
v1.use('/health', require('./health'));
v1.use('/auth', require('./auth'));
v1.use(require('./catalog')); // /categories, /categories/:slug, /services
v1.use('/me', require('./users'));
v1.use('/workers', require('./workers/public'));
v1.use('/worker/profile', require('./workers/profile'));
v1.use('/worker/skills', require('./workers/skills'));
v1.use('/bookings', require('./bookings'));
v1.use('/payments', require('./payments'));
v1.use('/wallet', require('./payments/wallet'));
v1.use('/worker/kyc', require('./kyc/worker'));
v1.use('/worker', require('./payments/payouts')); // /worker/earnings, /worker/payouts[...]
v1.use('/admin/kyc', require('./kyc/admin'));
v1.use('/admin/disputes', require('./disputes/admin'));
v1.use(require('./reviews')); // /bookings/:id/review, /workers/:id/reviews
v1.use(require('./disputes')); // /bookings/:id/dispute, /disputes/:id
v1.use('/referrals', require('./referrals'));
v1.use('/admin/catalog', require('./admin/catalog'));
v1.use('/admin/commission-rules', require('./admin/commission'));
v1.use('/admin/payouts', require('./admin/payouts'));
v1.use('/admin', require('./admin')); // general admin — mounted last among /admin*

// More routers are mounted here in later phases:
//   /auth /me /categories /services /workers /worker /bookings
//   /payments /wallet /reviews /disputes /referrals /admin /admin/kyc ...

app.use('/api/v1', v1);

// ── Fallbacks ────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ data: null, error: { code: 404, message: 'Not found' }, meta: null }));
app.use(errorHandler);

module.exports = app;
