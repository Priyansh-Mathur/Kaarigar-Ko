// Single shared Prisma client (mirrors src/prisma/prisma.service.ts).
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
