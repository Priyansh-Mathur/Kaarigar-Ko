// Public catalog reads (mirrors CatalogController/Service). Mounted at /api/v1 root.
const router = require('express').Router();
const prisma = require('../config/db');
const { ok, NotFound } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const cats = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        services: { where: { isActive: true }, orderBy: { name: 'asc' } },
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    res.json(ok(cats));
  }),
);

router.get(
  '/categories/:slug',
  asyncHandler(async (req, res) => {
    const c = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: { services: { where: { isActive: true } } },
    });
    if (!c) throw NotFound('Category not found');
    res.json(ok(c));
  }),
);

router.get(
  '/services',
  asyncHandler(async (req, res) => {
    const { categoryId } = req.query;
    const services = await prisma.service.findMany({
      where: { isActive: true, ...(categoryId ? { categoryId } : {}) },
      orderBy: { name: 'asc' },
    });
    res.json(ok(services));
  }),
);

module.exports = router;
