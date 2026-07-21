// /api/v1/admin/disputes — admin (mirrors AdminDisputesController).
const router = require('express').Router();
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const disputes = require('./service');
const { resolveDisputeSchema } = require('./schemas');

router.use(requireAuth, requireRoles('OPS_ADMIN', 'SUPER_ADMIN'));

router.get('/', asyncHandler(async (req, res) => res.json(ok(await disputes.adminList(req.query.status)))));

router.post('/:id/assign', asyncHandler(async (req, res) => res.json(ok(await disputes.assign(req.params.id, req.user.id)))));

router.post(
  '/:id/resolve',
  asyncHandler(async (req, res) => {
    const dto = validate(resolveDisputeSchema, req.body);
    res.json(ok(await disputes.resolve(req.params.id, req.user.id, dto)));
  }),
);

module.exports = router;
