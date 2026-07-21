// Phone OTP issuance + verification over Redis (mirrors src/auth/otp.service.ts).
// Codes stored hashed; bounded attempts + cooldown + hourly cap.
const { createHash, randomInt } = require('crypto');
const redis = require('../config/redis');
const env = require('../config/env');
const { HttpError } = require('../lib/envelope');

const OTP_TTL_SEC = 300;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SEC = 30;
const HOURLY_CAP = 5;

function hash(phone, code) {
  const pepper = env.JWT_ACCESS_SECRET || 'pepper';
  return createHash('sha256').update(`${phone}:${code}:${pepper}`).digest('hex');
}

async function issue(phone) {
  const cooldownKey = `otp:cooldown:${phone}`;
  if (await redis.get(cooldownKey)) {
    throw new HttpError(429, 'Please wait before requesting another OTP');
  }

  const countKey = `otp:count:${phone}`;
  const count = await redis.incr(countKey);
  if (count === 1) await redis.expire(countKey, 3600);
  if (count > HOURLY_CAP) {
    throw new HttpError(429, 'Too many OTP requests. Try again later.');
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const key = `otp:${phone}`;
  await redis.del(key);
  await redis.hset(key, { hash: hash(phone, code), attempts: '0' });
  await redis.expire(key, OTP_TTL_SEC);
  await redis.set(cooldownKey, '1', 'EX', COOLDOWN_SEC);

  return code;
}

async function verify(phone, code) {
  const key = `otp:${phone}`;
  const record = await redis.hgetall(key);

  if (!record || !record.hash) {
    throw new HttpError(400, 'No active OTP for this number, or it has expired');
  }
  if (record.hash !== hash(phone, code)) {
    const attempts = await redis.hincrby(key, 'attempts', 1);
    if (attempts >= MAX_ATTEMPTS) await redis.del(key);
    throw new HttpError(401, 'Invalid OTP');
  }
  await redis.del(key);
}

module.exports = { issue, verify };
