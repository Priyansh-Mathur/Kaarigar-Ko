// Mirrors src/admin/dto/admin.schemas.ts
const { z } = require('zod');

const suspendSchema = z.object({ reason: z.string().trim().max(300).optional() }).strict();
const featureSchema = z.object({ isFeatured: z.boolean() }).strict();
const setRoleSchema = z.object({ role: z.enum(['CUSTOMER', 'WORKER', 'OPS_ADMIN', 'SUPER_ADMIN']) }).strict();

const createCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'slug must be lowercase, alphanumeric, hyphenated'),
    parentId: z.string().uuid().optional(),
    iconUrl: z.string().url().optional(),
    sortOrder: z.number().int().min(0).optional(),
    defaultCommissionPct: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
const updateCategorySchema = createCategorySchema.partial().strict();

const createServiceSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(500).optional(),
    defaultDurationMin: z.number().int().min(5).max(1440).optional(),
    priceModel: z.enum(['FIXED', 'HOURLY', 'QUOTE']).optional(),
    basePrice: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
const updateServiceSchema = createServiceSchema.partial().omit({ categoryId: true }).strict();

const commissionRuleSchema = z
  .object({
    scope: z.enum(['GLOBAL', 'CATEGORY', 'WORKER_TIER']),
    categoryId: z.string().uuid().optional(),
    workerTier: z.string().trim().max(40).optional(),
    pct: z.number().min(0).max(100),
    fixedFee: z.number().int().min(0).optional(),
    effectiveFrom: z.string().datetime().optional(),
  })
  .strict();

const markPaidSchema = z.object({ providerRef: z.string().trim().max(120).optional() }).strict();

module.exports = {
  suspendSchema,
  featureSchema,
  setRoleSchema,
  createCategorySchema,
  updateCategorySchema,
  createServiceSchema,
  updateServiceSchema,
  commissionRuleSchema,
  markPaidSchema,
};
