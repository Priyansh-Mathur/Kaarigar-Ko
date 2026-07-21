const env = require('../config/env');

const DEFAULT_ORIGINS = ['http://localhost:3001', 'http://127.0.0.1:3001'];

function parseOrigins(value) {
  const raw = (value ?? '').trim();
  if (!raw) return DEFAULT_ORIGINS;
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsOptions() {
  return { origin: parseOrigins(env.CORS_ORIGIN) };
}

module.exports = { corsOptions, parseOrigins };