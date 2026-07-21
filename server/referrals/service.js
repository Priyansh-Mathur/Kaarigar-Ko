// Referrals (mirrors src/referrals/referrals.service.ts).
const prisma = require('../config/db');
const wallet = require('../money/wallet');
const { BadRequest, Conflict } = require('../lib/envelope');

const REWARD_PAISE = 5000; // ₹50 credit to both parties

function generateCode(userId) {
  const hex = userId.replace(/-/g, '').slice(0, 9);
  return 'KG' + parseInt(hex, 16).toString(36).toUpperCase().slice(0, 7);
}

async function myCode(userId) {
  let holder = await prisma.referral.findFirst({ where: { referrerId: userId, refereeId: null } });
  if (!holder) {
    holder = await prisma.referral.create({ data: { referrerId: userId, code: generateCode(userId), status: 'PENDING' } });
  }
  const referrals = await prisma.referral.count({ where: { referrerId: userId, refereeId: { not: null } } });
  return { code: holder.code, referrals, rewardPerReferral: REWARD_PAISE };
}

async function apply(refereeId, code) {
  const holder = await prisma.referral.findFirst({ where: { code, refereeId: null } });
  if (!holder) throw BadRequest('Invalid referral code');
  if (holder.referrerId === refereeId) throw BadRequest('You cannot use your own code');

  const already = await prisma.referral.findFirst({ where: { refereeId } });
  if (already) throw Conflict('A referral code was already applied to this account');

  const referrerWallet = await wallet.getOrCreate(holder.referrerId, 'CUSTOMER');
  const refereeWallet = await wallet.getOrCreate(refereeId, 'CUSTOMER');
  const appliedCode = `${code}:${refereeId.slice(0, 8)}`;

  const referral = await prisma.$transaction(async (tx) => {
    const r = await tx.referral.create({
      data: { referrerId: holder.referrerId, refereeId, code: appliedCode, status: 'REWARDED', rewardAmount: REWARD_PAISE },
    });
    await wallet.record(tx, referrerWallet.id, 'REFERRAL', REWARD_PAISE, r.id);
    await wallet.record(tx, refereeWallet.id, 'REFERRAL', REWARD_PAISE, r.id);
    return r;
  });

  return { applied: true, reward: REWARD_PAISE, referralId: referral.id };
}

module.exports = { myCode, apply };
