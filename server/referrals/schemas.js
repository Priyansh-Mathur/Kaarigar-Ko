// Mirrors src/referrals/dto/referral.schemas.ts
const { z } = require('zod');

const applyReferralSchema = z.object({ code: z.string().trim().min(4).max(40) }).strict();

module.exports = { applyReferralSchema };
