// Commission resolution (mirrors src/money/commission.service.ts).
// Precedence: CATEGORY rule -> GLOBAL rule -> category.defaultCommissionPct -> 15%.
const prisma = require('../config/db');

async function compute(categoryId, amountPaise) {
  const now = new Date();
  let pct;
  let fixed;

  const categoryRule = await prisma.commissionRule.findFirst({
    where: { scope: 'CATEGORY', categoryId, effectiveFrom: { lte: now } },
    orderBy: { effectiveFrom: 'desc' },
  });

  if (categoryRule) {
    pct = categoryRule.pct;
    fixed = categoryRule.fixedFee;
  } else {
    const globalRule = await prisma.commissionRule.findFirst({
      where: { scope: 'GLOBAL', effectiveFrom: { lte: now } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (globalRule) {
      pct = globalRule.pct;
      fixed = globalRule.fixedFee;
    } else {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      pct = (category && category.defaultCommissionPct) ?? 15;
      fixed = 0;
    }
  }

  const commission = Math.round((amountPaise * pct) / 100) + fixed;
  return Math.max(0, Math.min(commission, amountPaise));
}

module.exports = { compute };
