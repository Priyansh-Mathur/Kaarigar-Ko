// Reviews routes (mirrors ReviewsController). Mounted at /api/v1 root.
const router = require('express').Router();
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth } = require('../middleware/auth');
const reviews = require('./service');
const { createReviewSchema } = require('./schemas');

router.post(
  '/bookings/:id/review',
  requireAuth,
  asyncHandler(async (req, res) => {
    const dto = validate(createReviewSchema, req.body);
    res.status(201).json(ok(await reviews.create(req.params.id, req.user, dto)));
  }),
);

// Public.
router.get('/workers/:id/reviews', asyncHandler(async (req, res) => res.json(ok(await reviews.listForWorker(req.params.id)))));

module.exports = router;
