// Dispute routes (mirrors DisputesController). Mounted at /api/v1 root.
const router = require('express').Router();
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth } = require('../middleware/auth');
const disputes = require('./service');
const { raiseDisputeSchema } = require('./schemas');

router.post(
  '/bookings/:id/dispute',
  requireAuth,
  asyncHandler(async (req, res) => {
    const dto = validate(raiseDisputeSchema, req.body);
    res.status(201).json(ok(await disputes.raise(req.params.id, req.user, dto)));
  }),
);

router.get('/disputes/:id', requireAuth, asyncHandler(async (req, res) => res.json(ok(await disputes.get(req.params.id, req.user)))));

module.exports = router;
