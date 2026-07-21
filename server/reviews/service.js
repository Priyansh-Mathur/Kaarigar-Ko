// Reviews (mirrors src/reviews/reviews.service.ts). Verified reviews + rating recompute.
const prisma = require('../config/db');
const { NotFound, Forbidden, Conflict, BadRequest } = require('../lib/envelope');

async function create(bookingId, user, dto) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { worker: { select: { id: true, userId: true } } } });
  if (!b) throw NotFound('Booking not found');
  const isCustomer = b.customerId === user.id;
  const isWorker = b.worker && b.worker.userId === user.id;
  if (!isCustomer && !isWorker) throw Forbidden('Not your booking');
  if (!['COMPLETED', 'SETTLED'].includes(b.status)) throw Conflict('You can review only after the job is completed');

  const revieweeId = isCustomer ? b.worker && b.worker.userId : b.customerId;
  if (!revieweeId) throw BadRequest('No counterpart to review');

  const dup = await prisma.review.findFirst({ where: { bookingId, reviewerId: user.id } });
  if (dup) throw Conflict('You already reviewed this booking');

  const review = await prisma.review.create({
    data: { bookingId, reviewerId: user.id, revieweeId, rating: dto.rating, comment: dto.comment, photoUrls: dto.photoUrls ?? [], isVerified: true },
  });

  if (isCustomer && b.worker) await recompute(b.worker.id, revieweeId);
  return review;
}

async function recompute(workerProfileId, workerUserId) {
  const agg = await prisma.review.aggregate({ where: { revieweeId: workerUserId }, _avg: { rating: true }, _count: true });
  await prisma.workerProfile.update({ where: { id: workerProfileId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
}

async function listForWorker(workerId) {
  const wp = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!wp) throw NotFound('Worker not found');
  return prisma.review.findMany({
    where: { revieweeId: wp.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { rating: true, comment: true, photoUrls: true, isVerified: true, createdAt: true },
  });
}

module.exports = { create, listForWorker };
