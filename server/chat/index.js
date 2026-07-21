// Chat persistence (mirrors src/chat/chat.service.ts).
const prisma = require('../config/db');

function create(bookingId, senderId, body, attachmentUrl) {
  return prisma.chatMessage.create({ data: { bookingId, senderId, body, attachmentUrl } });
}

async function list(bookingId, limit = 50, cursor) {
  const items = await prisma.chatMessage.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? page[page.length - 1].id : null;
  return { items: page.reverse(), nextCursor };
}

async function markRead(bookingId, userId) {
  await prisma.chatMessage.updateMany({
    where: { bookingId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

module.exports = { create, list, markRead };
