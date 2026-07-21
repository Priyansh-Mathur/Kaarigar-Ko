// JWT auth middleware (mirrors JwtAuthGuard + RolesGuard).
// Secure-by-default is achieved by applying requireAuth on every protected router;
// public routes simply omit it.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { HttpError } = require('../lib/envelope');

function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Missing bearer token'));
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
    if (payload.type !== 'access') throw new Error('wrong token type');
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

// Optional auth: attach req.user if a valid token is present, never throw.
function optionalAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
      if (payload.type === 'access') req.user = { id: payload.sub, role: payload.role };
    } catch {
      /* ignore */
    }
  }
  next();
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Insufficient role for this action'));
    }
    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRoles };
