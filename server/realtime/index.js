// Socket.IO realtime hub (mirrors src/realtime/realtime.gateway.ts).
// JWT handshake; rooms user:<id> and booking:<id>. attach(server) wires it; services
// call emitToBooking/emitToUser.
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/db');
const chat = require('../chat');
const { corsOptions } = require('../lib/cors');

let io = null;

async function isParticipant(bookingId, userId) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { worker: { select: { userId: true } } },
  });
  if (!b) return false;
  return b.customerId === userId || (b.worker && b.worker.userId === userId);
}

function attach(server) {
  io = new Server(server, { cors: corsOptions() });

  io.on('connection', (socket) => {
    try {
      const token =
        (socket.handshake.auth && socket.handshake.auth.token) ||
        (socket.handshake.query && socket.handshake.query.token);
      if (!token) throw new Error('no token');
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
      if (payload.type !== 'access') throw new Error('bad token type');
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      socket.join(`user:${payload.sub}`);
    } catch {
      socket.emit('error', { message: 'unauthorized' });
      socket.disconnect(true);
      return;
    }

    socket.on('booking.join', async (data, cb) => {
      if (!(await isParticipant(data.bookingId, socket.data.userId))) return cb && cb({ error: 'forbidden' });
      socket.join(`booking:${data.bookingId}`);
      cb && cb({ joined: data.bookingId });
    });

    socket.on('chat.send', async (data, cb) => {
      if (!(await isParticipant(data.bookingId, socket.data.userId))) return cb && cb({ error: 'forbidden' });
      const msg = await chat.create(data.bookingId, socket.data.userId, data.body, data.attachmentUrl);
      io.to(`booking:${data.bookingId}`).emit('chat.message', msg);
      cb && cb({ sent: true, id: msg.id });
    });

    socket.on('chat.markRead', async (data, cb) => {
      if (!(await isParticipant(data.bookingId, socket.data.userId))) return cb && cb({ error: 'forbidden' });
      await chat.markRead(data.bookingId, socket.data.userId);
      io.to(`booking:${data.bookingId}`).emit('chat.read', { bookingId: data.bookingId, by: socket.data.userId });
      cb && cb({ ok: true });
    });

    socket.on('location.ping', async (data, cb) => {
      if (socket.data.role !== 'WORKER') return cb && cb({ error: 'forbidden' });
      if (!(await isParticipant(data.bookingId, socket.data.userId))) return cb && cb({ error: 'forbidden' });
      io.to(`booking:${data.bookingId}`).emit('booking.location_update', {
        bookingId: data.bookingId,
        lat: data.lat,
        lng: data.lng,
        at: Date.now(),
      });
      cb && cb({ ok: true });
    });

    socket.on('presence.heartbeat', (data, cb) => cb && cb({ ok: true, at: Date.now() }));
  });

  return io;
}

function emitToBooking(bookingId, event, payload) {
  if (io) io.to(`booking:${bookingId}`).emit(event, payload);
}
function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { attach, emitToBooking, emitToUser };
