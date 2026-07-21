// /api/v1/me (mirrors MeController/UsersService). Authed.
const router = require('express').Router();
const { Prisma } = require('@prisma/client');
const prisma = require('../config/db');
const { ok, NotFound, Conflict } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth } = require('../middleware/auth');
const { updateMeSchema, registerDeviceSchema } = require('./schemas');

router.use(requireAuth);

function shape(u) {
  return {
    id: u.id,
    role: u.role,
    phone: u.phone,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    locale: u.locale,
    status: u.status,
    workerProfile: u.workerProfile ?? null,
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { workerProfile: { select: { id: true, kycStatus: true, availabilityStatus: true } } },
    });
    if (!user) throw NotFound('User not found');
    res.json(ok(shape(user)));
  }),
);

router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const dto = validate(updateMeSchema, req.body);
    try {
      const user = await prisma.user.update({ where: { id: req.user.id }, data: dto });
      res.json(ok(shape({ ...user, workerProfile: null })));
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw Conflict('Email already in use');
      }
      throw e;
    }
  }),
);

router.post(
  '/devices',
  asyncHandler(async (req, res) => {
    const dto = validate(registerDeviceSchema, req.body);
    const device = await prisma.device.upsert({
      where: { fcmToken: dto.fcmToken },
      update: { userId: req.user.id, platform: dto.platform, lastSeen: new Date() },
      create: { userId: req.user.id, fcmToken: dto.fcmToken, platform: dto.platform },
    });
    res.json(ok({ id: device.id, platform: device.platform, registered: true }));
  }),
);

module.exports = router;
