// Mirrors src/payments/dto/payment.schemas.ts
const { z } = require('zod');

const createOrderSchema = z.object({ bookingId: z.string().uuid() }).strict();
const payoutRequestSchema = z.object({ amount: z.number().int().positive().optional() }).strict();

module.exports = { createOrderSchema, payoutRequestSchema };
