// Mirrors src/disputes/dto/dispute.schemas.ts
const { z } = require('zod');

const raiseDisputeSchema = z
  .object({ reason: z.string().trim().min(3).max(1000), evidenceUrls: z.array(z.string().url()).max(10).optional() })
  .strict();

const resolveDisputeSchema = z
  .object({
    resolution: z.enum(['REFUND_CUSTOMER', 'CREDIT_CUSTOMER', 'DISMISS']),
    amount: z.number().int().positive().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

module.exports = { raiseDisputeSchema, resolveDisputeSchema };
