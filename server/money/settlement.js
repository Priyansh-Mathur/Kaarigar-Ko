// Settlement (mirrors src/money/settlement.service.ts). Online escrow + cash flows.
const prisma = require('../config/db');
const commission = require('./commission');
const wallet = require('./wallet');
const realtime = require('../realtime');
const notifications = require('../notifications');
const { NotFound, BadRequest } = require('../lib/envelope');

// Settle an online booking once it's both COMPLETED and PAID (whichever lands last).
async function settleIfReady(bookingId) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { service: true, payments: true } });
  if (!b) return { skipped: 'not_found' };
  if (b.status === 'SETTLED') return { alreadySettled: true };
  if (b.status !== 'COMPLETED') return { pending: 'not_completed' };
  if (b.paymentMode === 'CASH') return { pending: 'awaiting_cash_confirm' };
  const paid = b.payments.find((p) => p.status === 'PAID');
  if (!paid) return { pending: 'awaiting_payment' };
  return doSettle(b.id, b.workerId, b.customerId, b.service.categoryId, paid.amount, 'online');
}

// Cash flow: worker collected cash; record the platform commission owed against their wallet.
async function settleCash(bookingId) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { service: true } });
  if (!b) throw NotFound('Booking not found');
  if (b.status === 'SETTLED') return { alreadySettled: true };
  if (b.paymentMode !== 'CASH') throw BadRequest('Not a cash booking');
  if (!b.workerId) throw BadRequest('No worker assigned');

  const amount = b.finalPrice ?? b.priceEstimate ?? 0;
  const comm = await commission.compute(b.service.categoryId, amount);
  const workerUserId = (await prisma.workerProfile.findUniqueOrThrow({ where: { id: b.workerId } })).userId;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({ data: { bookingId: b.id, provider: 'RAZORPAY', amount, status: 'PAID', method: 'CASH' } });
    const w = await wallet.getOrCreate(workerUserId, 'WORKER', tx);
    await wallet.record(tx, w.id, 'COMMISSION', -comm, b.id);
    await tx.booking.update({ where: { id: b.id }, data: { status: 'SETTLED', commissionAmount: comm, finalPrice: amount } });
    await tx.bookingEvent.create({ data: { bookingId: b.id, type: 'settled', payload: { mode: 'cash', amount, commission: comm } } });
  });

  realtime.emitToUser(workerUserId, 'booking.status_changed', { bookingId: b.id, status: 'SETTLED' });
  notifications.notify(workerUserId, 'earning', 'Cash collected 💰', `Job settled — commission ₹${Math.round(comm / 100)} recorded`, { bookingId: b.id });
  return { settled: true, amount, commission: comm, workerEarning: amount - comm, mode: 'cash' };
}

async function doSettle(bookingId, workerId, customerId, categoryId, amount, mode) {
  if (!workerId) {
    console.warn(`Booking ${bookingId} completed without a worker; cannot settle`);
    return { error: 'no_worker' };
  }
  const comm = await commission.compute(categoryId, amount);
  const workerEarning = amount - comm;
  const workerUserId = (await prisma.workerProfile.findUniqueOrThrow({ where: { id: workerId } })).userId;

  await prisma.$transaction(async (tx) => {
    const w = await wallet.getOrCreate(workerUserId, 'WORKER', tx);
    await wallet.record(tx, w.id, 'CREDIT', workerEarning, bookingId);
    await tx.booking.update({ where: { id: bookingId }, data: { status: 'SETTLED', commissionAmount: comm, finalPrice: amount } });
    await tx.bookingEvent.create({ data: { bookingId, type: 'settled', payload: { mode, amount, commission: comm, workerEarning } } });
  });

  realtime.emitToUser(workerUserId, 'booking.status_changed', { bookingId, status: 'SETTLED' });
  realtime.emitToUser(customerId, 'booking.status_changed', { bookingId, status: 'SETTLED' });
  notifications.notify(workerUserId, 'earning', 'You got paid 💰', `₹${Math.round(workerEarning / 100)} added to your wallet`, { bookingId });
  return { settled: true, amount, commission: comm, workerEarning, mode };
}

module.exports = { settleIfReady, settleCash };
