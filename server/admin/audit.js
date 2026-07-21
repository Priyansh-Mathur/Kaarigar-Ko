// Audit log (mirrors src/admin/audit.service.ts).
const prisma = require('../config/db');

function log(entry) {
  return prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: entry.before ?? undefined,
      after: entry.after ?? undefined,
      ip: entry.ip,
    },
  });
}

function list(limit = 100, cursor) {
  return prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
}

module.exports = { log, list };
