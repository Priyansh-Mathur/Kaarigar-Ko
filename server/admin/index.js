// /api/v1/admin — general admin (mirrors AdminController). Mounted LAST among /admin*.
const router = require('express').Router();
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const admin = require('./service');
const { suspendSchema, featureSchema, setRoleSchema } = require('./schemas');

router.use(requireAuth, requireRoles('OPS_ADMIN', 'SUPER_ADMIN'));

router.get('/analytics/overview', asyncHandler(async (req, res) => res.json(ok(await admin.overview()))));

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { role, q, limit, cursor } = req.query;
    res.json(ok(await admin.listUsers(role, q, limit ? Number(limit) : 50, cursor)));
  }),
);

router.post(
  '/users/:id/suspend',
  asyncHandler(async (req, res) => {
    const dto = validate(suspendSchema, req.body);
    res.json(ok(await admin.suspendUser(req.user.id, req.params.id, dto.reason)));
  }),
);

router.post('/users/:id/reinstate', asyncHandler(async (req, res) => res.json(ok(await admin.reinstateUser(req.user.id, req.params.id)))));

// SUPER_ADMIN only (method-level role override).
router.post(
  '/users/:id/role',
  requireRoles('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const dto = validate(setRoleSchema, req.body);
    res.json(ok(await admin.setRole(req.user.id, req.params.id, dto.role)));
  }),
);

router.get(
  '/workers',
  asyncHandler(async (req, res) => {
    const { q, kycStatus, limit, cursor } = req.query;
    res.json(ok(await admin.listWorkers(q, kycStatus, limit ? Number(limit) : 50, cursor)));
  }),
);

router.post(
  '/workers/:id/feature',
  asyncHandler(async (req, res) => {
    const dto = validate(featureSchema, req.body);
    res.json(ok(await admin.featureWorker(req.user.id, req.params.id, dto.isFeatured)));
  }),
);

router.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const { status, from, to, limit, cursor } = req.query;
    res.json(ok(await admin.listBookings({ status, from, to, limit: limit ? Number(limit) : 50, cursor })));
  }),
);

router.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const { limit, cursor } = req.query;
    res.json(ok(await admin.auditLogs(limit ? Number(limit) : 100, cursor)));
  }),
);

module.exports = router;
