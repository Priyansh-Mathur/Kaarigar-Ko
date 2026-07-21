# KaarigarKo API — Express + Prisma (plain JS, no build step).
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY server ./server

EXPOSE 3000

# Apply migrations, optionally backfill ~2 months of demo history, then start.
# Set SEED_DEMO_HISTORY=true once to populate demo data (idempotent; safe to leave on).
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$SEED_DEMO_HISTORY\" = \"true\" ]; then node prisma/seed-history.js || true; fi && node server/server.js"]
