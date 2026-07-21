// /api/v1/admin/commission-rules (mirrors AdminCommissionController/Service).
const router = require('express').Router();
const prisma = require('../config/db');
const audit = require('./audit');
const { ok, BadRequest } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { commissionRuleSchema } = require('./schemas');

router.use(requireAuth, requireRoles('OPS_ADMIN', 'SUPER_ADMIN'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(ok(await prisma.commissionRule.findMany({ orderBy: [{ scope: 'asc' }, { effectiveFrom: 'desc' }] })));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const dto = validate(commissionRuleSchema, req.body);
    if (dto.scope === 'CATEGORY' && !dto.categoryId) throw BadRequest('categoryId is required for CATEGORY scope');
    if (dto.scope === 'WORKER_TIER' && !dto.workerTier) throw BadRequest('workerTier is required for WORKER_TIER scope');
    const rule = await prisma.commissionRule.create({
      data: {
        scope: dto.scope,
        categoryId: dto.categoryId,
        workerTier: dto.workerTier,
        pct: dto.pct,
        fixedFee: dto.fixedFee ?? 0,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      },
    });
    await audit.log({ actorId: req.user.id, action: 'commission.create', entity: 'CommissionRule', entityId: rule.id, after: rule });
    res.json(ok(rule));
  }),
);

module.exports = router;
