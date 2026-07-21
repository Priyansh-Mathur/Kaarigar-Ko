// /api/v1/worker/skills — WORKER role (mirrors WorkerSkillsController/Service).
const router = require('express').Router();
const prisma = require('../config/db');
const { ok, NotFound, BadRequest } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { upsertSkillSchema } = require('./schemas');

router.use(requireAuth, requireRoles('WORKER'));

async function profileId(userId) {
  const p = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!p) throw NotFound('Create your worker profile first');
  return p.id;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workerId = await profileId(req.user.id);
    const skills = await prisma.workerSkill.findMany({
      where: { workerId },
      include: { category: { select: { name: true, slug: true } } },
    });
    res.json(ok(skills));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const dto = validate(upsertSkillSchema, req.body);
    const workerId = await profileId(req.user.id);
    const category = await prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw BadRequest('Unknown category');
    const skill = await prisma.workerSkill.upsert({
      where: { workerId_categoryId: { workerId, categoryId: dto.categoryId } },
      update: { priceType: dto.priceType, basePrice: dto.basePrice ?? 0 },
      create: { workerId, categoryId: dto.categoryId, priceType: dto.priceType, basePrice: dto.basePrice ?? 0 },
    });
    res.json(ok(skill));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const workerId = await profileId(req.user.id);
    const skill = await prisma.workerSkill.findUnique({ where: { id: req.params.id } });
    if (!skill || skill.workerId !== workerId) throw NotFound('Skill not found');
    await prisma.workerSkill.delete({ where: { id: req.params.id } });
    res.json(ok({ deleted: true }));
  }),
);

module.exports = router;
