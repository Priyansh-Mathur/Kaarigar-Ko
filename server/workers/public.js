// /api/v1/workers/* — public (mirrors WorkerPublicController).
const router = require('express').Router();
const { ok } = require('../lib/envelope');
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { workerSearchSchema } = require('./schemas');
const discovery = require('./discovery');

// '/search' must precede '/:id' so it isn't captured by the param route.
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = validate(workerSearchSchema, req.query);
    const results = await discovery.search(q);
    res.json(ok(results, { count: results.length }));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(ok(await discovery.publicProfile(req.params.id)));
  }),
);

module.exports = router;
