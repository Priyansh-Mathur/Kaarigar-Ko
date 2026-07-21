// /api/v1/auth/* — all public (mirrors AuthController).
const router = require('express').Router();
const asyncHandler = require('../lib/asyncHandler');
const { validate } = require('../lib/validate');
const { ok } = require('../lib/envelope');
const auth = require('./auth.service');
const { requestOtpSchema, verifyOtpSchema, refreshSchema, logoutSchema } = require('./schemas');

router.post(
  '/otp/request',
  asyncHandler(async (req, res) => {
    const dto = validate(requestOtpSchema, req.body);
    res.json(ok(await auth.requestOtp(dto.phone)));
  }),
);

router.post(
  '/otp/verify',
  asyncHandler(async (req, res) => {
    const dto = validate(verifyOtpSchema, req.body);
    res.json(ok(await auth.verifyOtp(dto.phone, dto.code, dto.role)));
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const dto = validate(refreshSchema, req.body);
    res.json(ok(await auth.refresh(dto.refreshToken)));
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const dto = validate(logoutSchema, req.body);
    res.json(ok(await auth.logout(dto.refreshToken, dto.allDevices)));
  }),
);

module.exports = router;
