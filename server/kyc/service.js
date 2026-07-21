// KYC (mirrors src/kyc/kyc.service.ts). Stores document references only.
const prisma = require('../config/db');
const realtime = require('../realtime');
const { NotFound } = require('../lib/envelope');

async function profile(userId) {
  const p = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!p) throw NotFound('Create your worker profile first');
  return p;
}

async function submit(userId, dto) {
  const p = await profile(userId);
  await prisma.kycDocument.createMany({ data: dto.documents.map((d) => ({ workerId: p.id, docType: d.docType, fileUrl: d.fileUrl })) });
  if (p.kycStatus === 'NONE' || p.kycStatus === 'REJECTED') {
    await prisma.workerProfile.update({ where: { id: p.id }, data: { kycStatus: 'PENDING' } });
  }
  return listForWorker(userId);
}

async function listForWorker(userId) {
  const p = await profile(userId);
  return prisma.kycDocument.findMany({ where: { workerId: p.id }, orderBy: { createdAt: 'desc' } });
}

async function queue(status = 'PENDING') {
  return prisma.kycDocument.findMany({
    where: { status },
    orderBy: { createdAt: 'asc' },
    include: { worker: { select: { id: true, user: { select: { name: true, phone: true } } } } },
  });
}

async function approve(docId, adminId) {
  const doc = await prisma.kycDocument.findUnique({ where: { id: docId } });
  if (!doc) throw NotFound('Document not found');
  await prisma.kycDocument.update({ where: { id: docId }, data: { status: 'APPROVED', reviewedBy: adminId, reviewedAt: new Date() } });
  await prisma.workerProfile.update({ where: { id: doc.workerId }, data: { kycStatus: 'APPROVED' } });
  const wp = await prisma.workerProfile.findUnique({ where: { id: doc.workerId } });
  if (wp) realtime.emitToUser(wp.userId, 'kyc.updated', { status: 'APPROVED' });
  return { approved: true };
}

async function reject(docId, adminId, reason) {
  const doc = await prisma.kycDocument.findUnique({ where: { id: docId } });
  if (!doc) throw NotFound('Document not found');
  await prisma.kycDocument.update({ where: { id: docId }, data: { status: 'REJECTED', reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: reason } });
  const approvedCount = await prisma.kycDocument.count({ where: { workerId: doc.workerId, status: 'APPROVED' } });
  if (approvedCount === 0) await prisma.workerProfile.update({ where: { id: doc.workerId }, data: { kycStatus: 'REJECTED' } });
  const wp = await prisma.workerProfile.findUnique({ where: { id: doc.workerId } });
  if (wp) realtime.emitToUser(wp.userId, 'kyc.updated', { status: 'REJECTED', reason });
  return { rejected: true };
}

module.exports = { submit, listForWorker, queue, approve, reject };
