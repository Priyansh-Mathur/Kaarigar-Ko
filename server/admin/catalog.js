// /api/v1/admin/catalog — admin catalog CRUD (mirrors AdminCatalogController/Service).
const router = require('express').Router();
const prisma = require('../config/db');
const audit = require('./audit');
const { ok, NotFound } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { createCategorySchema, updateCategorySchema, createServiceSchema, updateServiceSchema } = require('./schemas');

router.use(requireAuth, requireRoles('OPS_ADMIN', 'SUPER_ADMIN'));

router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const dto = validate(createCategorySchema, req.body);
    const category = await prisma.category.create({ data: dto });
    await audit.log({ actorId: req.user.id, action: 'category.create', entity: 'Category', entityId: category.id, after: category });
    res.status(201).json(ok(category));
  }),
);

router.patch(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const dto = validate(updateCategorySchema, req.body);
    const before = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!before) throw NotFound('Category not found');
    const after = await prisma.category.update({ where: { id: req.params.id }, data: dto });
    await audit.log({ actorId: req.user.id, action: 'category.update', entity: 'Category', entityId: req.params.id, before, after });
    res.json(ok(after));
  }),
);

router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const before = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!before) throw NotFound('Category not found');
    const after = await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
    await audit.log({ actorId: req.user.id, action: 'category.deactivate', entity: 'Category', entityId: req.params.id, before, after });
    res.json(ok(after));
  }),
);

router.post(
  '/services',
  asyncHandler(async (req, res) => {
    const dto = validate(createServiceSchema, req.body);
    const category = await prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw NotFound('Category not found');
    const service = await prisma.service.create({ data: dto });
    await audit.log({ actorId: req.user.id, action: 'service.create', entity: 'Service', entityId: service.id, after: service });
    res.status(201).json(ok(service));
  }),
);

router.patch(
  '/services/:id',
  asyncHandler(async (req, res) => {
    const dto = validate(updateServiceSchema, req.body);
    const before = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!before) throw NotFound('Service not found');
    const after = await prisma.service.update({ where: { id: req.params.id }, data: dto });
    await audit.log({ actorId: req.user.id, action: 'service.update', entity: 'Service', entityId: req.params.id, before, after });
    res.json(ok(after));
  }),
);

router.delete(
  '/services/:id',
  asyncHandler(async (req, res) => {
    const before = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!before) throw NotFound('Service not found');
    const after = await prisma.service.update({ where: { id: req.params.id }, data: { isActive: false } });
    await audit.log({ actorId: req.user.id, action: 'service.deactivate', entity: 'Service', entityId: req.params.id, before, after });
    res.json(ok(after));
  }),
);

module.exports = router;
