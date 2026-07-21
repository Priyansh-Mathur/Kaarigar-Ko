// /api/v1/wallet (mirrors WalletController). Authed.
const router = require('express').Router();
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const wallet = require('../money/wallet');

router.use(requireAuth);

const ownerType = (role) => (role === 'WORKER' ? 'WORKER' : 'CUSTOMER');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(ok(await wallet.getOrCreate(req.user.id, ownerType(req.user.role))));
  }),
);

router.get(
  '/transactions',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 50;
    const result = await wallet.transactions(req.user.id, ownerType(req.user.role), limit, req.query.cursor);
    res.json(ok(result.items, { nextCursor: result.nextCursor, balance: result.balance }));
  }),
);

module.exports = router;
