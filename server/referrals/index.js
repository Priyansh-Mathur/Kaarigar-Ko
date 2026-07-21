// /api/v1/referrals (mirrors ReferralsController). Authed.
const router = require('express').Router();
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth } = require('../middleware/auth');
const referrals = require('./service');
const { applyReferralSchema } = require('./schemas');

router.use(requireAuth);

router.get('/me', asyncHandler(async (req, res) => res.json(ok(await referrals.myCode(req.user.id)))));

router.post(
  '/apply',
  asyncHandler(async (req, res) => {
    const dto = validate(applyReferralSchema, req.body);
    res.json(ok(await referrals.apply(req.user.id, dto.code)));
  }),
);

module.exports = router;
