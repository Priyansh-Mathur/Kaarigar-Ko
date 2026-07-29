const env = require('../config/env');

const DEFAULT_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://kaarigar-ko.netlify.app',
];

function parseOrigins(value) {
  const raw = (value ?? '').trim();
  if (!raw) return DEFAULT_ORIGINS;
  return [...new Set([
    ...DEFAULT_ORIGINS,
    ...raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  ])];
}

function corsOptions() {
  return { origin: parseOrigins(env.CORS_ORIGIN) };
}

module.exports = { corsOptions, parseOrigins };
