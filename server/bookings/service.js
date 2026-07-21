// Booking lifecycle (mirrors src/bookings/bookings.service.ts).
const prisma = require('../config/db');
const discovery = require('../workers/discovery');
const realtime = require('../realtime');
const settlement = require('../money/settlement');
const notifications = require('../notifications');
const redis = require('../config/redis');
const { canWorkerTransition, TERMINAL_STATUSES } = require('./status');
const { BadRequest, Conflict, Forbidden, NotFound } = require('../lib/envelope');

function event(bookingId, type, actorId, payload) {
  return prisma.bookingEvent.create({
    data: { bookingId, type, actorId: actorId ?? undefined, payload: payload ?? undefined },
  });
}

function emitStatus(customerId, workerUserId, bookingId, status) {
  realtime.emitToUser(customerId, 'booking.status_changed', { bookingId, status });
  if (workerUserId) realtime.emitToUser(workerUserId, 'booking.status_changed', { bookingId, status });
  realtime.emitToBooking(bookingId, 'booking.status_changed', { bookingId, status });
}

const STATUS_NOTIFY = {
  ACCEPTED: ['Booking accepted ✅', 'Your pro accepted the job.'],
  EN_ROUTE: ['Pro on the way 🚗', 'Your pro is heading to you.'],
  IN_PROGRESS: ['Work started 🔧', 'Your pro has started the job.'],
  COMPLETED: ['Job completed 🎉', 'All done — please rate your pro.'],
};
function notifyCustomerStatus(customerId, bookingId, status) {
  const m = STATUS_NOTIFY[status];
  if (m) notifications.notify(customerId, `booking.${status.toLowerCase()}`, m[0], m[1], { bookingId });
}

async function workerProfileForUser(userId) {
  const wp = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!wp) throw Forbidden('No worker profile');
  return wp;
}

async function adjustReliability(workerId, delta) {
  const wp = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!wp) return;
  const next = Math.max(0, Math.min(100, wp.reliabilityScore + delta));
  await prisma.workerProfile.update({ where: { id: workerId }, data: { reliabilityScore: next } });
}

async function getDetailById(bookingId) {
  const b = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      service: { include: { category: { select: { name: true, slug: true } } } },
      worker: { select: { id: true, userId: true, ratingAvg: true, user: { select: { name: true, avatarUrl: true } } } },
      events: { orderBy: { createdAt: 'asc' } },
      quotes: { orderBy: { createdAt: 'desc' } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });
  const loc = await prisma.$queryRawUnsafe(
    `SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng FROM bookings WHERE id = $1`,
    bookingId,
  );
  return { ...b, location: loc[0] && loc[0].lat != null ? { lat: loc[0].lat, lng: loc[0].lng } : null };
}

async function assertParticipant(bookingId, user) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { worker: { select: { userId: true } } },
  });
  if (!b) throw NotFound('Booking not found');
  const isCustomer = b.customerId === user.id;
  const isWorker = b.worker && b.worker.userId === user.id;
  const isAdmin = user.role === 'OPS_ADMIN' || user.role === 'SUPER_ADMIN';
  if (!isCustomer && !isWorker && !isAdmin) throw Forbidden('Not your booking');
  return b;
}

async function getDetail(bookingId, user) {
  await assertParticipant(bookingId, user);
  return getDetailById(bookingId);
}

async function create(customerId, dto) {
  const service = await prisma.service.findUnique({ where: { id: dto.serviceId }, include: { category: true } });
  if (!service || !service.isActive) throw BadRequest('Unknown or inactive service');

  let workerId = null;
  if (dto.workerId) {
    const wp = await prisma.workerProfile.findUnique({ where: { id: dto.workerId }, include: { skills: true } });
    if (!wp || wp.kycStatus !== 'APPROVED') throw BadRequest('Worker unavailable');
    if (!wp.skills.some((s) => s.categoryId === service.categoryId)) throw BadRequest('Worker does not offer this service');
    workerId = wp.id;
  } else {
    workerId = await discovery.findBestWorkerId(service.categoryId, dto.lat, dto.lng);
  }

  const booking = await prisma.booking.create({
    data: {
      customerId,
      workerId: workerId ?? undefined,
      serviceId: service.id,
      addressId: dto.addressId,
      status: 'REQUESTED',
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      priceEstimate: service.basePrice,
      paymentMode: dto.paymentMode,
      isRecurring: dto.isRecurring ?? false,
      recurrenceRule: dto.recurrenceRule,
    },
  });

  await prisma.$executeRawUnsafe(
    `UPDATE bookings SET location = ST_SetSRID(ST_MakePoint($1,$2),4326)::geography WHERE id = $3`,
    dto.lng,
    dto.lat,
    booking.id,
  );
  await event(booking.id, 'created', customerId, { workerId, instant: !dto.scheduledAt, notes: dto.notes });

  if (workerId) {
    const wp = await prisma.workerProfile.findUnique({ where: { id: workerId } });
    if (wp) {
      realtime.emitToUser(wp.userId, 'booking.worker_assigned', { bookingId: booking.id });
      notifications.notify(wp.userId, 'job.new', 'New job request 🛠️', `${service.name} nearby — tap to accept`, { bookingId: booking.id });
    }
  }
  realtime.emitToUser(customerId, 'booking.status_changed', { bookingId: booking.id, status: 'REQUESTED' });

  return getDetailById(booking.id);
}

async function listForUser(user, status) {
  if (user.role === 'WORKER') {
    const wp = await prisma.workerProfile.findUnique({ where: { userId: user.id } });
    if (!wp) return [];
    return prisma.booking.findMany({
      where: { workerId: wp.id, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { service: { select: { name: true } } },
    });
  }
  return prisma.booking.findMany({
    where: { customerId: user.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { service: { select: { name: true } } },
  });
}

async function accept(bookingId, user) {
  const wp = await workerProfileForUser(user.id);
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b) throw NotFound('Booking not found');
  if (b.workerId !== wp.id) throw Forbidden('Not assigned to you');
  if (b.status !== 'REQUESTED') throw Conflict(`Cannot accept from ${b.status}`);

  await prisma.booking.update({ where: { id: bookingId }, data: { status: 'ACCEPTED' } });
  await event(bookingId, 'accepted', user.id);
  emitStatus(b.customerId, wp.userId, bookingId, 'ACCEPTED');
  notifyCustomerStatus(b.customerId, bookingId, 'ACCEPTED');
  return getDetailById(bookingId);
}

async function reject(bookingId, user) {
  const wp = await workerProfileForUser(user.id);
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b) throw NotFound('Booking not found');
  if (b.workerId !== wp.id) throw Forbidden('Not assigned to you');
  if (b.status !== 'REQUESTED') throw Conflict(`Cannot reject from ${b.status}`);

  await prisma.booking.update({ where: { id: bookingId }, data: { status: 'REJECTED' } });
  await event(bookingId, 'rejected', user.id);
  await adjustReliability(wp.id, -3);
  emitStatus(b.customerId, wp.userId, bookingId, 'REJECTED');
  return getDetailById(bookingId);
}

async function updateStatus(bookingId, user, dto) {
  const wp = await workerProfileForUser(user.id);
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b) throw NotFound('Booking not found');
  if (b.workerId !== wp.id) throw Forbidden('Not assigned to you');
  if (!canWorkerTransition(b.status, dto.status)) throw Conflict(`Illegal transition ${b.status} -> ${dto.status}`);

  const data = { status: dto.status };
  if (dto.status === 'COMPLETED') data.finalPrice = dto.finalPrice ?? b.finalPrice ?? b.priceEstimate ?? 0;
  await prisma.booking.update({ where: { id: bookingId }, data });
  await event(bookingId, dto.status.toLowerCase(), user.id, { photoUrls: dto.photoUrls });
  emitStatus(b.customerId, wp.userId, bookingId, dto.status);
  notifyCustomerStatus(b.customerId, bookingId, dto.status);

  if (dto.status === 'COMPLETED') {
    await prisma.workerProfile.update({ where: { id: wp.id }, data: { completedJobs: { increment: 1 } } });
    await adjustReliability(wp.id, 1);
    await settlement.settleIfReady(bookingId);
  }
  return getDetailById(bookingId);
}

async function cancel(bookingId, user, dto) {
  const b = await assertParticipant(bookingId, user);
  if (TERMINAL_STATUSES.includes(b.status)) throw Conflict(`Cannot cancel a ${b.status} booking`);
  const isWorkerActor = b.worker && b.worker.userId === user.id;
  if (isWorkerActor) {
    if (!['ACCEPTED', 'EN_ROUTE'].includes(b.status)) throw Conflict(`Worker cannot cancel from ${b.status}`);
  } else if (!['REQUESTED', 'ACCEPTED'].includes(b.status)) {
    throw Conflict(`Customer cannot cancel from ${b.status}`);
  }

  const status = isWorkerActor ? 'CANCELLED_BY_WORKER' : 'CANCELLED_BY_CUSTOMER';
  await prisma.booking.update({ where: { id: bookingId }, data: { status } });
  await event(bookingId, 'cancelled', user.id, { by: isWorkerActor ? 'worker' : 'customer', reason: dto.reason });
  if (isWorkerActor && b.workerId) await adjustReliability(b.workerId, -5);
  emitStatus(b.customerId, b.worker ? b.worker.userId : null, bookingId, status);
  return getDetailById(bookingId);
}

async function createQuote(bookingId, user, dto) {
  const wp = await workerProfileForUser(user.id);
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b || b.workerId !== wp.id) throw Forbidden('Not your booking');
  if (!['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'].includes(b.status)) throw Conflict('Quote not allowed in current state');
  const quote = await prisma.quote.create({ data: { bookingId, workerId: wp.id, amount: dto.amount, notes: dto.notes } });
  await event(bookingId, 'quote_proposed', user.id, { quoteId: quote.id, amount: dto.amount });
  realtime.emitToUser(b.customerId, 'booking.quote_proposed', { bookingId, quote });
  return quote;
}

async function acceptQuote(bookingId, user, dto) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b || b.customerId !== user.id) throw Forbidden('Not your booking');
  const quote = await prisma.quote.findUnique({ where: { id: dto.quoteId } });
  if (!quote || quote.bookingId !== bookingId) throw NotFound('Quote not found');

  await prisma.$transaction([
    prisma.quote.update({ where: { id: quote.id }, data: { status: 'ACCEPTED' } }),
    prisma.quote.updateMany({ where: { bookingId, id: { not: quote.id }, status: 'PROPOSED' }, data: { status: 'DECLINED' } }),
    prisma.booking.update({ where: { id: bookingId }, data: { finalPrice: quote.amount, priceEstimate: quote.amount } }),
  ]);
  await event(bookingId, 'quote_accepted', user.id, { quoteId: quote.id, amount: quote.amount });

  if (b.workerId) {
    const wp = await prisma.workerProfile.findUnique({ where: { id: b.workerId } });
    if (wp) realtime.emitToUser(wp.userId, 'booking.quote_accepted', { bookingId, amount: quote.amount });
  }
  return getDetailById(bookingId);
}

async function track(bookingId, user, dto) {
  const wp = await workerProfileForUser(user.id);
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b || b.workerId !== wp.id) throw Forbidden('Not your booking');
  if (b.status !== 'EN_ROUTE') throw Conflict('Tracking only during EN_ROUTE');

  const payload = { bookingId, lat: dto.lat, lng: dto.lng, at: Date.now() };
  await redis.set(`booking:loc:${bookingId}`, JSON.stringify(payload), 'EX', 120);
  realtime.emitToBooking(bookingId, 'booking.location_update', payload);
  realtime.emitToUser(b.customerId, 'booking.location_update', payload);
  return { ok: true };
}

async function cashConfirm(bookingId, user) {
  const wp = await workerProfileForUser(user.id);
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b || b.workerId !== wp.id) throw Forbidden('Not your booking');
  if (b.paymentMode !== 'CASH') throw BadRequest('Booking is not cash mode');
  if (b.status !== 'COMPLETED') throw Conflict('Complete the job before confirming cash');

  const result = await settlement.settleCash(bookingId);
  emitStatus(b.customerId, wp.userId, bookingId, 'SETTLED');
  return result;
}

async function sos(bookingId, user, location) {
  await assertParticipant(bookingId, user);
  await event(bookingId, 'sos', user.id, { location });
  realtime.emitToBooking(bookingId, 'safety.sos', { bookingId, raisedBy: user.id, role: user.role, location, at: Date.now() });
  return { ok: true, alerted: true };
}

module.exports = {
  create,
  listForUser,
  getDetail,
  assertParticipant,
  accept,
  reject,
  updateStatus,
  cancel,
  createQuote,
  acceptQuote,
  track,
  cashConfirm,
  sos,
};
