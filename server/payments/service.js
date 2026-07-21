// Payments (mirrors src/payments/payments.service.ts incl. UPI-QR).
const QRCode = require('qrcode');
const prisma = require('../config/db');
const settlement = require('../money/settlement');
const realtime = require('../realtime');
const provider = require('./provider');
const { BadRequest, Conflict, Forbidden, NotFound } = require('../lib/envelope');

const PAYABLE_STATUSES = ['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'];

async function createOrder(user, bookingId) {
  if (process.env.NODE_ENV === 'production' && provider.name !== 'razorpay') {
    throw BadRequest('Razorpay is required in production');
  }
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b) throw NotFound('Booking not found');
  if (b.customerId !== user.id) throw Forbidden('Not your booking');
  if (b.paymentMode !== 'ONLINE') throw BadRequest('Booking is cash mode');
  if (!PAYABLE_STATUSES.includes(b.status)) throw Conflict(`Booking not payable in state ${b.status}`);
  if (await prisma.payment.findFirst({ where: { bookingId, status: 'PAID' } })) throw Conflict('Booking already paid');

  const amount = b.finalPrice ?? b.priceEstimate ?? 0;
  if (amount <= 0) throw BadRequest('Invalid amount');

  const order = await provider.createOrder({ amountPaise: amount, currency: 'INR', receipt: `bk_${bookingId.slice(0, 8)}` });
  const payment = await prisma.payment.create({
    data: { bookingId, provider: 'RAZORPAY', providerOrderId: order.providerOrderId, amount, status: 'PENDING' },
  });

  return {
    paymentId: payment.id,
    orderId: order.providerOrderId,
    amount,
    currency: 'INR',
    provider: provider.name,
    keyId: provider.name === 'razorpay' ? process.env.RAZORPAY_KEY_ID : null,
    ...(provider.name === 'mock' ? { mockPayUrl: `/api/v1/payments/order/${order.providerOrderId}/mock-pay` } : {}),
  };
}

async function handleWebhook(rawBody, signature, body) {
  if (!provider.verifySignature(rawBody, signature)) throw BadRequest('Invalid webhook signature');
  const parsed = parse(body);
  if (!parsed) return { ignored: true };
  return applyPayment(parsed);
}

async function mockPay(orderId) {
  if (process.env.NODE_ENV === 'production') throw Forbidden('Disabled in production');
  return applyPayment({ providerOrderId: orderId, providerPaymentId: `pay_mock_${Date.now()}`, method: 'UPI', status: 'PAID' });
}

function parse(body) {
  const b = body || {};
  const entity = b.payload && b.payload.payment && b.payload.payment.entity;
  if (entity) {
    return {
      providerOrderId: entity.order_id,
      providerPaymentId: entity.id,
      method: (entity.method ?? '').toUpperCase(),
      status: entity.status === 'captured' || entity.status === 'authorized' ? 'PAID' : 'FAILED',
    };
  }
  if (b.providerOrderId) {
    return { providerOrderId: b.providerOrderId, providerPaymentId: b.providerPaymentId, method: b.method, status: b.status ?? 'PAID' };
  }
  return null;
}

async function applyPayment(p) {
  const payment = await prisma.payment.findFirst({ where: { providerOrderId: p.providerOrderId } });
  if (!payment) return { ignored: true, reason: 'unknown_order' };
  if (payment.status === 'PAID') return { ok: true, idempotent: true };

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: p.status, providerPaymentId: p.providerPaymentId, method: mapMethod(p.method) },
  });

  const booking = await prisma.booking.findUnique({ where: { id: payment.bookingId } });
  if (booking) realtime.emitToUser(booking.customerId, 'payment.updated', { bookingId: booking.id, status: p.status });

  const settle = p.status === 'PAID' ? await settlement.settleIfReady(payment.bookingId) : null;
  return { ok: true, paymentStatus: p.status, settlement: settle };
}

function mapMethod(method) {
  if (!method) return undefined;
  const up = method.toUpperCase();
  if (['UPI', 'CARD', 'NETBANKING', 'WALLET', 'CASH'].includes(up)) return up;
  if (up === 'EMI' || up === 'EMANDATE') return 'CARD';
  return undefined;
}

// ── UPI QR ────────────────────────────────────────────────────────────────
async function createUpiQr(user, bookingId) {
  if (process.env.NODE_ENV === 'production') {
    throw BadRequest('Manual UPI QR flow is disabled in production; use Razorpay checkout/webhooks');
  }
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b) throw NotFound('Booking not found');
  if (b.customerId !== user.id) throw Forbidden('Not your booking');
  if (b.paymentMode !== 'ONLINE') throw BadRequest('Booking is cash mode');
  if (!PAYABLE_STATUSES.includes(b.status)) throw Conflict(`Booking not payable in state ${b.status}`);
  if (await prisma.payment.findFirst({ where: { bookingId, status: 'PAID' } })) throw Conflict('Booking already paid');

  const amount = b.finalPrice ?? b.priceEstimate ?? 0;
  if (amount <= 0) throw BadRequest('Invalid amount');

  const existing = await prisma.payment.findFirst({
    where: { bookingId, status: 'PENDING', providerOrderId: { startsWith: 'upiqr_' } },
    orderBy: { createdAt: 'desc' },
  });
  const orderId = (existing && existing.providerOrderId) || `upiqr_${bookingId.slice(0, 8)}_${Date.now().toString(36)}`;
  if (!existing) {
    await prisma.payment.create({
      data: { bookingId, provider: 'RAZORPAY', providerOrderId: orderId, amount, method: 'UPI', status: 'PENDING' },
    });
  }

  const vpa = process.env.UPI_VPA || 'kaarigarko@upi';
  const payeeName = process.env.UPI_PAYEE_NAME || 'KaarigarKo';
  const amountRupees = (amount / 100).toFixed(2);
  const note = `KaarigarKo ${b.id.slice(0, 8)}`;
  const upiUri =
    `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}` +
    `&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(note)}&tr=${encodeURIComponent(orderId)}`;
  const qr = await QRCode.toDataURL(upiUri, { width: 320, margin: 1 });

  return { orderId, amount, vpa, payeeName, upiUri, qr };
}

async function confirmUpi(user, bookingId) {
  if (process.env.NODE_ENV === 'production') {
    throw BadRequest('Manual UPI confirmation is disabled in production; use Razorpay webhook verification');
  }
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { worker: true } });
  if (!b) throw NotFound('Booking not found');
  const isCustomer = b.customerId === user.id;
  const isWorker = !!b.worker && b.worker.userId === user.id;
  if (!isCustomer && !isWorker) throw Forbidden('Not your booking');
  if (b.paymentMode !== 'ONLINE') throw BadRequest('Booking is cash mode');

  const payment = await prisma.payment.findFirst({
    where: { bookingId, providerOrderId: { startsWith: 'upiqr_' } },
    orderBy: { createdAt: 'desc' },
  });
  if (!payment || !payment.providerOrderId) throw Conflict('Generate the UPI QR first');
  if (payment.status === 'PAID') return { ok: true, idempotent: true };

  return applyPayment({ providerOrderId: payment.providerOrderId, providerPaymentId: `upi_${Date.now()}`, method: 'UPI', status: 'PAID' });
}

module.exports = { createOrder, handleWebhook, mockPay, createUpiQr, confirmUpi };
