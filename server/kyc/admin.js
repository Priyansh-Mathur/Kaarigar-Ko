// /api/v1/admin/kyc — admin (mirrors AdminKycController).
const router = require('express').Router();
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const kyc = require('./service');
const { rejectKycSchema } = require('./schemas');

router.use(requireAuth, requireRoles('OPS_ADMIN', 'SUPER_ADMIN'));

router.get('/', asyncHandler(async (req, res) => res.json(ok(await kyc.queue(req.query.status ?? 'PENDING')))));

router.post('/:id/approve', asyncHandler(async (req, res) => res.json(ok(await kyc.approve(req.params.id, req.user.id)))));

router.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const dto = validate(rejectKycSchema, req.body);
    res.json(ok(await kyc.reject(req.params.id, req.user.id, dto.reason)));
  }),
);

module.exports = router;
