// /api/v1/payments/* (mirrors PaymentsController). All routes HttpCode 200.
const router = require('express').Router();
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const payments = require('./service');
const { createOrderSchema } = require('./schemas');

router.post(
  '/order',
  requireAuth,
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const dto = validate(createOrderSchema, req.body);
    res.json(ok(await payments.createOrder(req.user, dto.bookingId)));
  }),
);

// Public: provider webhook (raw body captured globally for HMAC verification).
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    res.json(ok(await payments.handleWebhook(req.rawBody, req.headers['x-razorpay-signature'], req.body)));
  }),
);

// Public: dev mock-pay trigger.
router.post(
  '/order/:orderId/mock-pay',
  asyncHandler(async (req, res) => {
    res.json(ok(await payments.mockPay(req.params.orderId)));
  }),
);

router.post(
  '/upi/qr',
  requireAuth,
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const dto = validate(createOrderSchema, req.body);
    res.json(ok(await payments.createUpiQr(req.user, dto.bookingId)));
  }),
);

// Either the customer or the assigned worker may confirm a UPI transfer.
router.post(
  '/upi/confirm',
  requireAuth,
  asyncHandler(async (req, res) => {
    const dto = validate(createOrderSchema, req.body);
    res.json(ok(await payments.confirmUpi(req.user, dto.bookingId)));
  }),
);

module.exports = router;
