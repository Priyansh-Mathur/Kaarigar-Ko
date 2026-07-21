// /api/v1/admin/payouts (mirrors AdminPayoutsController/Service).
const router = require('express').Router();
const prisma = require('../config/db');
const audit = require('./audit');
const { ok, NotFound, Conflict } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { markPaidSchema } = require('./schemas');

router.use(requireAuth, requireRoles('OPS_ADMIN', 'SUPER_ADMIN'));

async function transition(adminId, id, from, to, providerRef) {
  const payout = await prisma.payout.findUnique({ where: { id } });
  if (!payout) throw NotFound('Payout not found');
  if (!from.includes(payout.status)) throw Conflict(`Cannot move payout from ${payout.status} to ${to}`);
  const after = await prisma.payout.update({
    where: { id },
    data: { status: to, providerRef: providerRef ?? payout.providerRef, processedAt: to === 'PAID' ? new Date() : payout.processedAt },
  });
  await audit.log({ actorId: adminId, action: `payout.${to.toLowerCase()}`, entity: 'Payout', entityId: id, before: payout, after });
  return after;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = req.query.status;
    res.json(ok(await prisma.payout.findMany({
      where: status ? { status } : {},
      orderBy: { requestedAt: 'desc' },
      include: { worker: { select: { user: { select: { name: true, phone: true } } } } },
    })));
  }),
);

router.post('/:id/approve', asyncHandler(async (req, res) => res.json(ok(await transition(req.user.id, req.params.id, ['QUEUED'], 'PROCESSING')))));

router.post(
  '/:id/mark-paid',
  asyncHandler(async (req, res) => {
    const dto = validate(markPaidSchema, req.body);
    res.json(ok(await transition(req.user.id, req.params.id, ['QUEUED', 'PROCESSING'], 'PAID', dto.providerRef)));
  }),
);

router.post('/:id/retry', asyncHandler(async (req, res) => res.json(ok(await transition(req.user.id, req.params.id, ['FAILED'], 'QUEUED')))));

module.exports = router;
