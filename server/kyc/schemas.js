// Mirrors src/kyc/dto/kyc.schemas.ts
const { z } = require('zod');

const submitKycSchema = z
  .object({
    documents: z
      .array(z.object({ docType: z.string().trim().min(2).max(40), fileUrl: z.string().url() }))
      .min(1)
      .max(5),
  })
  .strict();

const rejectKycSchema = z.object({ reason: z.string().trim().min(3).max(300) }).strict();

module.exports = { submitKycSchema, rejectKycSchema };
