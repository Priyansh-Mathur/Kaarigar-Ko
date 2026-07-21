// Shared ioredis client (mirrors src/redis/redis.service.ts).
const Redis = require('ioredis');

const url = process.env.REDIS_URL || 'redis://localhost:6379';
const client = new Redis(url, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 2,
  connectTimeout: 3000,
  retryStrategy: (times) => (times > 10 ? null : Math.min(times * 200, 2000)),
});

let errorLogged = false;
client.on('ready', () => {
  errorLogged = false;
  console.log('Connected to Redis');
});
client.on('error', (err) => {
  if (!errorLogged) {
    errorLogged = true;
    console.warn(`Redis unavailable: ${err.message || 'connection refused'}`);
  }
});

module.exports = client;
