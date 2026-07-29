// Auth flows (mirrors src/auth/auth.service.ts): OTP -> JWT access + rotating refresh.
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const redis = require('../config/redis');
const env = require('../config/env');
const otp = require('./otp');
const { sendOtp } = require('./sms');
const { HttpError } = require('../lib/envelope');

async function requestOtp(phone) {
  const code = await otp.issue(phone);
  await sendOtp(phone, code);
  const response = { sent: true, expiresInSec: 300 };
  if (env.NODE_ENV !== 'production' || env.SMS_PROVIDER !== 'msg91' || !env.SMS_PROVIDER_KEY || !env.SMS_MSG91_FLOW_ID) {
    // Demo fallback: surface the code so the bundled demo clients can auto-fill it.
    // A configured MSG91 production service never returns the code to the client.
    response.devOtp = code;
  }
  return response;
}

async function verifyOtp(phone, code, role) {
  await otp.verify(phone, code);

  let user = await prisma.user.findUnique({ where: { phone } });
  const isNew = !user;
  if (!user) {
    user = await prisma.user.create({ data: { phone, role: role ?? 'CUSTOMER' } });
  }
  if (user.status === 'SUSPENDED') throw new HttpError(401, 'Account suspended');

  const tokens = await issueTokens(user.id, user.role);
  return { user: publicUser(user), isNew, ...tokens };
}

async function refresh(refreshToken) {
  const payload = verifyRefresh(refreshToken);

  const key = `refresh:${payload.sub}:${payload.jti}`;
  const exists = await redis.get(key);
  if (!exists) throw new HttpError(401, 'Refresh token revoked or expired');

  // Rotate: invalidate the presented token before issuing a new pair.
  await redis.del(key);
  await redis.srem(`refresh:jtis:${payload.sub}`, payload.jti);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status === 'SUSPENDED') throw new HttpError(401, 'Account unavailable');
  return issueTokens(user.id, user.role);
}

async function logout(refreshToken, allDevices = false) {
  try {
    const payload = verifyRefresh(refreshToken);
    if (allDevices) {
      const setKey = `refresh:jtis:${payload.sub}`;
      const jtis = await redis.smembers(setKey);
      const keys = jtis.map((jti) => `refresh:${payload.sub}:${jti}`);
      if (keys.length) await redis.del(...keys);
      await redis.del(setKey);
    } else {
      await redis.del(`refresh:${payload.sub}:${payload.jti}`);
      await redis.srem(`refresh:jtis:${payload.sub}`, payload.jti);
    }
  } catch {
    // Idempotent: an already-invalid token is treated as success.
  }
  return { success: true };
}

function verifyRefresh(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    throw new HttpError(401, 'Invalid refresh token');
  }
  if (payload.type !== 'refresh') throw new HttpError(401, 'Invalid refresh token');
  return payload;
}

async function issueTokens(userId, role) {
  const accessTtl = env.JWT_ACCESS_TTL || 900;
  const refreshTtl = env.JWT_REFRESH_TTL || 2592000;
  const jti = randomUUID();

  const accessToken = jwt.sign({ sub: userId, role, type: 'access' }, env.JWT_ACCESS_SECRET, { expiresIn: accessTtl });
  const refreshToken = jwt.sign({ sub: userId, jti, type: 'refresh' }, env.JWT_REFRESH_SECRET, { expiresIn: refreshTtl });

  await redis.set(`refresh:${userId}:${jti}`, '1', 'EX', refreshTtl);
  await redis.sadd(`refresh:jtis:${userId}`, jti);

  return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: accessTtl };
}

function publicUser(u) {
  return {
    id: u.id,
    role: u.role,
    phone: u.phone,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    locale: u.locale,
    status: u.status,
  };
}

module.exports = { requestOtp, verifyOtp, refresh, logout };
