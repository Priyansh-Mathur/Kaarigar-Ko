// Disputes (mirrors src/disputes/disputes.service.ts).
const prisma = require('../config/db');
const wallet = require('../money/wallet');
const realtime = require('../realtime');
const { NotFound, Forbidden, Conflict } = require('../lib/envelope');

async function raise(bookingId, user, dto) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { worker: { select: { userId: true } } } });
  if (!b) throw NotFound('Booking not found');
  if (b.customerId !== user.id && !(b.worker && b.worker.userId === user.id)) throw Forbidden('Not your booking');

  const dispute = await prisma.dispute.create({ data: { bookingId, raisedById: user.id, reason: dto.reason, evidenceUrls: dto.evidenceUrls ?? [] } });
  await prisma.bookingEvent.create({ data: { bookingId, type: 'dispute_raised', actorId: user.id, payload: { disputeId: dispute.id } } });

  realtime.emitToUser(b.customerId, 'dispute.updated', { disputeId: dispute.id, status: 'OPEN' });
  if (b.worker && b.worker.userId) realtime.emitToUser(b.worker.userId, 'dispute.updated', { disputeId: dispute.id, status: 'OPEN' });
  return dispute;
}

async function get(id, user) {
  const d = await prisma.dispute.findUnique({ where: { id }, include: { booking: { include: { worker: { select: { userId: true } } } } } });
  if (!d) throw NotFound('Dispute not found');
  const isParty = d.booking.customerId === user.id || (d.booking.worker && d.booking.worker.userId === user.id) || d.raisedById === user.id;
  const isAdmin = user.role === 'OPS_ADMIN' || user.role === 'SUPER_ADMIN';
  if (!isParty && !isAdmin) throw Forbidden('Not allowed');
  return d;
}

function adminList(status) {
  return prisma.dispute.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    include: { booking: { select: { id: true, status: true, finalPrice: true, priceEstimate: true, customerId: true } } },
  });
}

async function assign(id, adminId) {
  const d = await prisma.dispute.findUnique({ where: { id } });
  if (!d) throw NotFound('Dispute not found');
  return prisma.dispute.update({ where: { id }, data: { assignedTo: adminId, status: 'UNDER_REVIEW' } });
}

async function resolve(id, adminId, dto) {
  const d = await prisma.dispute.findUnique({ where: { id }, include: { booking: true } });
  if (!d) throw NotFound('Dispute not found');
  if (d.status === 'RESOLVED') throw Conflict('Dispute already resolved');

  if (dto.resolution !== 'DISMISS') {
    const amount = dto.amount ?? d.booking.finalPrice ?? d.booking.priceEstimate ?? 0;
    if (amount > 0) {
      const w = await wallet.getOrCreate(d.booking.customerId, 'CUSTOMER');
      await prisma.$transaction(async (tx) => {
        await wallet.record(tx, w.id, 'REFUND', amount, d.bookingId);
      });
    }
  }

  const updated = await prisma.dispute.update({ where: { id }, data: { status: 'RESOLVED', resolvedBy: adminId, resolutionNotes: dto.notes ?? dto.resolution } });
  await prisma.bookingEvent.create({ data: { bookingId: d.bookingId, type: 'dispute_resolved', actorId: adminId, payload: { resolution: dto.resolution, amount: dto.amount } } });
  realtime.emitToUser(d.booking.customerId, 'dispute.updated', { disputeId: id, status: 'RESOLVED' });
  return updated;
}

module.exports = { raise, get, adminList, assign, resolve };
