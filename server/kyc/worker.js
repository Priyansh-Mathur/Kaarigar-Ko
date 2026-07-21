// /api/v1/worker/kyc — WORKER (mirrors KycController).
const router = require('express').Router();
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const kyc = require('./service');
const { submitKycSchema } = require('./schemas');

router.use(requireAuth, requireRoles('WORKER'));

router.get('/', asyncHandler(async (req, res) => res.json(ok(await kyc.listForWorker(req.user.id)))));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const dto = validate(submitKycSchema, req.body);
    res.status(201).json(ok(await kyc.submit(req.user.id, dto)));
  }),
);

module.exports = router;
