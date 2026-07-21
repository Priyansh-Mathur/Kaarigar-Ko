// GET /api/v1/health — liveness + db/redis checks (mirrors HealthController).
const router = require('express').Router();
const prisma = require('../config/db');
const redis = require('../config/redis');
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const checks = { api: 'ok', db: 'down', redis: 'down' };
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = 'ok';
    } catch {
      checks.db = 'down';
    }
    try {
      checks.redis = (await redis.ping()) === 'PONG' ? 'ok' : 'down';
    } catch {
      checks.redis = 'down';
    }
    const healthy = checks.db === 'ok' && checks.redis === 'ok';
    const status = healthy ? 'healthy' : 'degraded';
    res.status(healthy ? 200 : 503).json(ok({ status, checks, timestamp: new Date().toISOString() }));
  }),
);

module.exports = router;
