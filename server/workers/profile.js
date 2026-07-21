// /api/v1/worker/profile — WORKER role (mirrors WorkerProfileController/Service).
const router = require('express').Router();
const prisma = require('../config/db');
const { ok, Conflict, NotFound, Forbidden } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { createWorkerProfileSchema, updateWorkerProfileSchema } = require('./schemas');

router.use(requireAuth, requireRoles('WORKER'));

async function setLocation(profileId, lat, lng) {
  // lng, lat order for ST_MakePoint.
  await prisma.$executeRawUnsafe(
    `UPDATE worker_profiles SET base_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
    lng,
    lat,
    profileId,
  );
}

async function getProfile(profileId) {
  const p = await prisma.workerProfile.findUniqueOrThrow({ where: { id: profileId }, include: { skills: true } });
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ST_Y(base_location::geometry) AS lat, ST_X(base_location::geometry) AS lng FROM worker_profiles WHERE id = $1`,
    profileId,
  );
  const loc = rows[0];
  return {
    id: p.id,
    userId: p.userId,
    bio: p.bio,
    yearsExperience: p.yearsExperience,
    serviceRadiusKm: p.serviceRadiusKm,
    availabilityStatus: p.availabilityStatus,
    kycStatus: p.kycStatus,
    reliabilityScore: p.reliabilityScore,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    completedJobs: p.completedJobs,
    location: loc && loc.lat != null ? { lat: loc.lat, lng: loc.lng } : null,
    skills: p.skills,
  };
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const dto = validate(createWorkerProfileSchema, req.body);
    const userId = req.user.id;
    const existing = await prisma.workerProfile.findUnique({ where: { userId } });
    if (existing) throw Conflict('Worker profile already exists; use PATCH to update');
    const profile = await prisma.workerProfile.create({
      data: { userId, bio: dto.bio, yearsExperience: dto.yearsExperience ?? 0, serviceRadiusKm: dto.serviceRadiusKm ?? 10 },
    });
    if (dto.lat != null && dto.lng != null) await setLocation(profile.id, dto.lat, dto.lng);
    res.json(ok(await getProfile(profile.id)));
  }),
);

router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const dto = validate(updateWorkerProfileSchema, req.body);
    const userId = req.user.id;
    const existing = await prisma.workerProfile.findUnique({ where: { userId } });
    if (!existing) throw NotFound('Worker profile not found; create it first');
    if (dto.availabilityStatus === 'ONLINE' && existing.kycStatus !== 'APPROVED') {
      throw Forbidden('Complete KYC verification before going online');
    }
    const { lat, lng, ...rest } = dto;
    await prisma.workerProfile.update({ where: { id: existing.id }, data: rest });
    if (lat != null && lng != null) await setLocation(existing.id, lat, lng);
    res.json(ok(await getProfile(existing.id)));
  }),
);

module.exports = router;
module.exports.getProfile = getProfile;
