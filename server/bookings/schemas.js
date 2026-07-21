// Mirrors src/bookings/dto/booking.schemas.ts
const { z } = require('zod');

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

const createBookingSchema = z
  .object({
    serviceId: z.string().uuid(),
    lat,
    lng,
    addressId: z.string().uuid().optional(),
    scheduledAt: z.string().datetime().optional(),
    paymentMode: z.enum(['ONLINE', 'CASH']).default('ONLINE'),
    workerId: z.string().uuid().optional(),
    isRecurring: z.boolean().optional(),
    recurrenceRule: z.string().max(200).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

const statusUpdateSchema = z
  .object({
    status: z.enum(['EN_ROUTE', 'IN_PROGRESS', 'COMPLETED']),
    finalPrice: z.number().int().min(0).optional(),
    photoUrls: z.array(z.string().url()).max(10).optional(),
  })
  .strict();

const cancelSchema = z.object({ reason: z.string().max(300).optional() }).strict();
const quoteSchema = z.object({ amount: z.number().int().min(0), notes: z.string().max(500).optional() }).strict();
const acceptQuoteSchema = z.object({ quoteId: z.string().uuid() }).strict();
const trackSchema = z.object({ lat, lng }).strict();
const sosSchema = z.object({ lat: lat.optional(), lng: lng.optional() }).strict();
const messageSchema = z
  .object({ body: z.string().max(2000).optional(), attachmentUrl: z.string().url().optional() })
  .strict()
  .refine((v) => Boolean(v.body || v.attachmentUrl), { message: 'body or attachmentUrl is required' });

module.exports = {
  createBookingSchema,
  statusUpdateSchema,
  cancelSchema,
  quoteSchema,
  acceptQuoteSchema,
  trackSchema,
  sosSchema,
  messageSchema,
};
