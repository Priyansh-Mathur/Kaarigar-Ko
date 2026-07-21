// Mirrors src/auth/dto/auth.schemas.ts
const { z } = require('zod');

const phone = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, 'Phone must be E.164 format, e.g. +919000000000');

const signupRole = z.enum(['CUSTOMER', 'WORKER']);

const requestOtpSchema = z.object({ phone, role: signupRole.optional() }).strict();
const verifyOtpSchema = z
  .object({ phone, code: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'), role: signupRole.optional() })
  .strict();
const refreshSchema = z.object({ refreshToken: z.string().min(10) }).strict();
const logoutSchema = z.object({ refreshToken: z.string().min(10), allDevices: z.boolean().optional() }).strict();

module.exports = { requestOtpSchema, verifyOtpSchema, refreshSchema, logoutSchema };
