// Mirrors src/reviews/dto/review.schemas.ts
const { z } = require('zod');

const createReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
    photoUrls: z.array(z.string().url()).max(6).optional(),
  })
  .strict();

module.exports = { createReviewSchema };
