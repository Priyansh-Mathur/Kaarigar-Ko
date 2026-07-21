// /api/v1/worker/{earnings,payouts,payouts/request} (mirrors PayoutsController/Service).
// Mounted AFTER /worker/profile and /worker/skills so it only receives these paths.
const router = require('express').Router();
const prisma = require('../config/db');
const wallet = require('../money/wallet');
const { ok, Forbidden, BadRequest } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { payoutRequestSchema } = require('./schemas');

router.use(requireAuth, requireRoles('WORKER'));

async function workerProfile(userId) {
  const wp = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!wp) throw Forbidden('No worker profile');
  return wp;
}

router.get(
  '/earnings',
  asyncHandler(async (req, res) => {
    const w = await wallet.getOrCreate(req.user.id, 'WORKER');
    const credits = await prisma.walletTransaction.aggregate({ where: { walletId: w.id, type: 'CREDIT' }, _sum: { amount: true } });
    const pending = await prisma.payout.aggregate({
      where: { worker: { userId: req.user.id }, status: { in: ['QUEUED', 'PROCESSING'] } },
      _sum: { amount: true },
    });
    res.json(ok({ balance: w.balance, totalEarned: credits._sum.amount ?? 0, pendingPayouts: pending._sum.amount ?? 0, currency: w.currency }));
  }),
);

router.get(
  '/payouts',
  asyncHandler(async (req, res) => {
    const wp = await workerProfile(req.user.id);
    res.json(ok(await prisma.payout.findMany({ where: { workerId: wp.id }, orderBy: { requestedAt: 'desc' } })));
  }),
);

router.post(
  '/payouts/request',
  asyncHandler(async (req, res) => {
    const dto = validate(payoutRequestSchema, req.body);
    const wp = await workerProfile(req.user.id);
    const w = await wallet.getOrCreate(req.user.id, 'WORKER');
    const amt = dto.amount ?? w.balance;
    if (amt <= 0) throw BadRequest('Nothing available to withdraw');
    if (amt > w.balance) throw BadRequest('Amount exceeds available balance');
    const result = await prisma.$transaction(async (tx) => {
      await wallet.record(tx, w.id, 'PAYOUT', -amt);
      return tx.payout.create({ data: { workerId: wp.id, amount: amt, status: 'QUEUED' } });
    });
    res.json(ok(result));
  }),
);

module.exports = router;
