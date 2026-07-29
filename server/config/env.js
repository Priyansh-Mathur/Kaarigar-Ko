// Loads .env and validates the core environment (mirrors src/config/env.validation.ts).
// Optional extras (RAZORPAY_*, UPI_*, etc.) are read directly from process.env where used.
require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3001,http://127.0.0.1:3001'),
  JWT_ACCESS_SECRET: z.string().min(1).default('dev_access_secret_change_me'),
  JWT_REFRESH_SECRET: z.string().min(1).default('dev_refresh_secret_change_me'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2592000),
  // MSG91 Flow credentials. Required in production so OTPs are never silently dropped.
  SMS_PROVIDER: z.enum(['msg91', 'disabled']).default('disabled'),
  SMS_PROVIDER_KEY: z.string().optional(),
  SMS_MSG91_FLOW_ID: z.string().optional(),
  SMS_OTP_VARIABLE: z.string().default('otp'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

module.exports = parsed.data;
