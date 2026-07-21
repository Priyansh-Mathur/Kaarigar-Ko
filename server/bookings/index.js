// /api/v1/bookings/* (mirrors BookingsController + MessagesController). All authed.
const router = require('express').Router();
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const bookings = require('./service');
const chat = require('../chat');
const realtime = require('../realtime');
const {
  createBookingSchema,
  statusUpdateSchema,
  cancelSchema,
  quoteSchema,
  acceptQuoteSchema,
  trackSchema,
  sosSchema,
  messageSchema,
} = require('./schemas');

router.use(requireAuth);

router.post(
  '/',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const dto = validate(createBookingSchema, req.body);
    res.status(201).json(ok(await bookings.create(req.user.id, dto)));
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(ok(await bookings.listForUser(req.user, req.query.status)));
  }),
);

// Chat (mounted before '/:id' is irrelevant — distinct segment count, but keep grouped).
router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    await bookings.assertParticipant(req.params.id, req.user);
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 50;
    const result = await chat.list(req.params.id, limit, req.query.cursor);
    res.json(ok(result.items, { nextCursor: result.nextCursor }));
  }),
);

router.post(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    await bookings.assertParticipant(req.params.id, req.user);
    const dto = validate(messageSchema, req.body);
    const msg = await chat.create(req.params.id, req.user.id, dto.body, dto.attachmentUrl);
    realtime.emitToBooking(req.params.id, 'chat.message', msg);
    res.status(201).json(ok(msg));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(ok(await bookings.getDetail(req.params.id, req.user)));
  }),
);

router.post(
  '/:id/accept',
  requireRoles('WORKER'),
  asyncHandler(async (req, res) => res.json(ok(await bookings.accept(req.params.id, req.user)))),
);

router.post(
  '/:id/reject',
  requireRoles('WORKER'),
  asyncHandler(async (req, res) => res.json(ok(await bookings.reject(req.params.id, req.user)))),
);

router.post(
  '/:id/status',
  requireRoles('WORKER'),
  asyncHandler(async (req, res) => {
    const dto = validate(statusUpdateSchema, req.body);
    res.json(ok(await bookings.updateStatus(req.params.id, req.user, dto)));
  }),
);

router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const dto = validate(cancelSchema, req.body);
    res.json(ok(await bookings.cancel(req.params.id, req.user, dto)));
  }),
);

router.post(
  '/:id/quote',
  requireRoles('WORKER'),
  asyncHandler(async (req, res) => {
    const dto = validate(quoteSchema, req.body);
    res.status(201).json(ok(await bookings.createQuote(req.params.id, req.user, dto)));
  }),
);

router.post(
  '/:id/quote/accept',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const dto = validate(acceptQuoteSchema, req.body);
    res.json(ok(await bookings.acceptQuote(req.params.id, req.user, dto)));
  }),
);

router.post(
  '/:id/track',
  requireRoles('WORKER'),
  asyncHandler(async (req, res) => {
    const dto = validate(trackSchema, req.body);
    res.json(ok(await bookings.track(req.params.id, req.user, dto)));
  }),
);

router.post(
  '/:id/cash/confirm',
  requireRoles('WORKER'),
  asyncHandler(async (req, res) => res.json(ok(await bookings.cashConfirm(req.params.id, req.user)))),
);

router.post(
  '/:id/sos',
  asyncHandler(async (req, res) => {
    const dto = validate(sosSchema, req.body);
    const location = dto.lat != null && dto.lng != null ? { lat: dto.lat, lng: dto.lng } : undefined;
    res.json(ok(await bookings.sos(req.params.id, req.user, location)));
  }),
);

module.exports = router;
