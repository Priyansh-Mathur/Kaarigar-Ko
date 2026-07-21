// Admin core (mirrors src/admin/admin.service.ts).
const prisma = require('../config/db');
const audit = require('./audit');
const { NotFound } = require('../lib/envelope');

async function overview() {
  const [settled, byStatus, workersTotal, workersOnline, customers, disputesOpen, disputesTotal, bookingsTotal] = await Promise.all([
    prisma.booking.aggregate({ where: { status: 'SETTLED' }, _sum: { finalPrice: true, commissionAmount: true }, _count: true }),
    prisma.booking.groupBy({ by: ['status'], _count: true }),
    prisma.workerProfile.count(),
    prisma.workerProfile.count({ where: { availabilityStatus: 'ONLINE' } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    prisma.dispute.count(),
    prisma.booking.count(),
  ]);

  const statusCounts = {};
  for (const row of byStatus) statusCounts[row.status] = row._count;

  return {
    gmv: settled._sum.finalPrice ?? 0,
    revenue: settled._sum.commissionAmount ?? 0,
    settledBookings: settled._count,
    bookingsTotal,
    statusCounts,
    workers: { total: workersTotal, online: workersOnline },
    customers,
    disputes: { open: disputesOpen, total: disputesTotal, rate: bookingsTotal ? Number((disputesTotal / bookingsTotal).toFixed(4)) : 0 },
  };
}

function listUsers(role, q, limit = 50, cursor) {
  return prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

async function suspendUser(adminId, userId, reason) {
  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) throw NotFound('User not found');
  const after = await prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
  await audit.log({ actorId: adminId, action: 'user.suspend', entity: 'User', entityId: userId, before, after });
  return { ...after, reason };
}

async function reinstateUser(adminId, userId) {
  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) throw NotFound('User not found');
  const after = await prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
  await audit.log({ actorId: adminId, action: 'user.reinstate', entity: 'User', entityId: userId, before, after });
  return after;
}

async function setRole(adminId, userId, role) {
  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) throw NotFound('User not found');
  const after = await prisma.user.update({ where: { id: userId }, data: { role } });
  await audit.log({ actorId: adminId, action: 'user.set_role', entity: 'User', entityId: userId, before, after });
  return after;
}

function listWorkers(q, kycStatus, limit = 50, cursor) {
  return prisma.workerProfile.findMany({
    where: {
      ...(kycStatus ? { kycStatus } : {}),
      ...(q ? { user: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: { select: { name: true, phone: true, status: true } } },
  });
}

async function featureWorker(adminId, workerId, isFeatured) {
  const wp = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!wp) throw NotFound('Worker not found');
  const after = await prisma.workerProfile.update({ where: { id: workerId }, data: { isFeatured } });
  await audit.log({ actorId: adminId, action: 'worker.feature', entity: 'WorkerProfile', entityId: workerId, after });
  return after;
}

function listBookings({ status, from, to, limit = 50, cursor }) {
  return prisma.booking.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { service: { select: { name: true } }, worker: { select: { user: { select: { name: true } } } } },
  });
}

function auditLogs(limit = 100, cursor) {
  return audit.list(limit, cursor);
}

module.exports = { overview, listUsers, suspendUser, reinstateUser, setRole, listWorkers, featureWorker, listBookings, auditLogs };
