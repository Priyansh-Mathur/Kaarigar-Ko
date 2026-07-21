// Wallet ledger (mirrors src/money/wallet.service.ts). Append-only with running balance.
const prisma = require('../config/db');

async function getOrCreate(userId, ownerType, db = prisma) {
  const existing = await db.wallet.findUnique({ where: { userId_ownerType: { userId, ownerType } } });
  if (existing) return existing;
  return db.wallet.create({ data: { userId, ownerType } });
}

// Append a ledger entry + update balance atomically (call inside a $transaction).
// signedAmount: positive credit, negative debit.
async function record(tx, walletId, type, signedAmount, reference) {
  const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: walletId } });
  const newBalance = wallet.balance + signedAmount;
  await tx.walletTransaction.create({
    data: { walletId, type, amount: Math.abs(signedAmount), reference, runningBalance: newBalance },
  });
  await tx.wallet.update({ where: { id: walletId }, data: { balance: newBalance } });
  return newBalance;
}

async function transactions(userId, ownerType, limit = 50, cursor) {
  const wallet = await getOrCreate(userId, ownerType);
  const items = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null, balance: wallet.balance };
}

module.exports = { getOrCreate, record, transactions };
