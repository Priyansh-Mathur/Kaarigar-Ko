// Mirrors src/users/dto/me.schemas.ts
const { z } = require('zod');

const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    email: z.string().trim().email().optional(),
    avatarUrl: z.string().trim().url().optional(),
    locale: z.string().trim().min(2).max(10).optional(),
  })
  .strict();

const registerDeviceSchema = z
  .object({ fcmToken: z.string().trim().min(1), platform: z.enum(['ANDROID', 'IOS', 'WEB']) })
  .strict();

module.exports = { updateMeSchema, registerDeviceSchema };
