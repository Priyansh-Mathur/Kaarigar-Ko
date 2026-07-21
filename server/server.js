// HTTP entrypoint. Loads env first (validates + dotenv), then boots Express.
// Socket.IO is attached in the realtime phase.
const env = require('./config/env');
const http = require('http');
const app = require('./app');
const prisma = require('./config/db');

const server = http.createServer(app);

// Attach the Socket.IO realtime gateway (JWT handshake, booking/user rooms).
require('./realtime').attach(server);

prisma
  .$connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch((e) => console.warn(`PostgreSQL connection failed at startup: ${e.message}`));

const PORT = env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`KaarigarKo API running on http://localhost:${PORT}/api/v1`);
});
