// Mirrors src/workers/dto/worker.schemas.ts
const { z } = require('zod');

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

const createWorkerProfileSchema = z
  .object({
    bio: z.string().trim().max(1000).optional(),
    yearsExperience: z.number().int().min(0).max(70).optional(),
    serviceRadiusKm: z.number().int().min(1).max(100).optional(),
    lat: lat.optional(),
    lng: lng.optional(),
  })
  .strict()
  .refine((v) => (v.lat == null) === (v.lng == null), { message: 'lat and lng must be provided together', path: ['lat'] });

const updateWorkerProfileSchema = z
  .object({
    bio: z.string().trim().max(1000).optional(),
    yearsExperience: z.number().int().min(0).max(70).optional(),
    serviceRadiusKm: z.number().int().min(1).max(100).optional(),
    availabilityStatus: z.enum(['ONLINE', 'OFFLINE', 'BUSY']).optional(),
    lat: lat.optional(),
    lng: lng.optional(),
  })
  .strict()
  .refine((v) => (v.lat == null) === (v.lng == null), { message: 'lat and lng must be provided together', path: ['lat'] });

const upsertSkillSchema = z
  .object({
    categoryId: z.string().uuid(),
    priceType: z.enum(['FIXED', 'HOURLY', 'QUOTE']).default('FIXED'),
    basePrice: z.number().int().min(0).optional(),
  })
  .strict();

const workerSearchSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    categoryId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strip();

module.exports = { createWorkerProfileSchema, updateWorkerProfileSchema, upsertSkillSchema, workerSearchSchema };
