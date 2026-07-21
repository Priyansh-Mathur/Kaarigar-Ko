/*
 * prisma/seed-history.js
 * Backfills ~2 months of realistic activity so the platform looks established
 * (workers, customers, bookings across 60 days, payments, reviews, wallet ledgers,
 * payouts, disputes). Backdates createdAt so history/analytics span the period.
 *
 * Runs with plain `node prisma/seed-history.js` (CommonJS — no ts-node/tsconfig),
 * so it works inside the Render container where the DB is reachable.
 * Idempotent: guarded by an AuditLog marker; safe to leave the flag on.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CITY = { lng: 79.9864, lat: 23.1815 }; // Jabalpur (matches existing seed)
const DAYS = 60;
const NUM_BOOKINGS = 150;
const MARKER = 'demo_history_seeded';

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const chance = (p) => Math.random() < p;
const daysAgo = (d) => {
  const t = new Date(Date.now() - Math.max(0, d) * 864e5);
  t.setHours(8 + rnd(13), rnd(60), rnd(60), 0); // daytime hours
  return t;
};
const plus = (date, mins) => new Date(date.getTime() + mins * 60000);

const FIRST = ['Amit', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Pooja', 'Arjun', 'Neha', 'Rohit', 'Kavya', 'Sanjay', 'Divya', 'Manish', 'Ananya', 'Karan', 'Meera', 'Suresh', 'Ritu', 'Deepak', 'Nisha'];
const LAST = ['Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Yadav', 'Jain', 'Mehta', 'Reddy', 'Nair', 'Das', 'Kumar', 'Joshi', 'Rao'];
const COMMENTS = ['Great work!', 'Very professional.', 'On time and tidy.', 'Highly recommend.', 'Fixed it quickly.', 'Polite and skilled.', null, null];

async function main() {
  if (await prisma.auditLog.findFirst({ where: { action: MARKER } })) {
    console.log('History already seeded — skipping.');
    return;
  }

  const categories = await prisma.category.findMany({ include: { services: true } });
  if (!categories.length) throw new Error('Base catalog missing — run `npm run db:seed` first.');

  // ── Workers: 1–2 per category ─────────────────────────────────────────────
  const workers = []; // { profileId, userId, category }
  let wi = 0;
  for (const c of categories) {
    const n = ['electrician', 'plumber', 'cleaner'].includes(c.slug) ? 2 : 1;
    for (let k = 0; k < n; k++) {
      wi++;
      const phone = '+9170000' + String(10000 + wi).slice(-5);
      const joined = daysAgo(DAYS - rnd(8));
      const user = await prisma.user.upsert({
        where: { phone }, update: {},
        create: { phone, role: 'WORKER', name: pick(FIRST) + ' ' + pick(LAST), createdAt: joined },
      });
      let wp = await prisma.workerProfile.findUnique({ where: { userId: user.id } });
      if (!wp) {
        wp = await prisma.workerProfile.create({
          data: {
            userId: user.id,
            bio: `Experienced ${c.name.toLowerCase()} serving your neighbourhood.`,
            yearsExperience: 2 + rnd(10),
            serviceRadiusKm: 8 + rnd(10),
            availabilityStatus: chance(0.6) ? 'ONLINE' : 'OFFLINE',
            kycStatus: 'APPROVED',
            createdAt: joined,
          },
        });
      }
      const svc = c.services[0];
      if (svc) {
        await prisma.workerSkill.upsert({
          where: { workerId_categoryId: { workerId: wp.id, categoryId: c.id } }, update: {},
          create: { workerId: wp.id, categoryId: c.id, priceType: 'FIXED', basePrice: svc.basePrice, createdAt: joined },
        });
      }
      await prisma.wallet.upsert({
        where: { userId_ownerType: { userId: user.id, ownerType: 'WORKER' } }, update: {},
        create: { userId: user.id, ownerType: 'WORKER' },
      });
      workers.push({ profileId: wp.id, userId: user.id, category: c });
    }
  }
  // Fold in the existing demo worker (Ravi) if present.
  const ravi = await prisma.user.findUnique({ where: { phone: '+919000000003' }, include: { workerProfile: true } });
  const electrician = categories.find((c) => c.slug === 'electrician');
  if (ravi && ravi.workerProfile && electrician) {
    workers.push({ profileId: ravi.workerProfile.id, userId: ravi.id, category: electrician });
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  const customers = [];
  for (let i = 1; i <= 18; i++) {
    const phone = '+9188000' + String(10000 + i).slice(-5);
    const joined = daysAgo(DAYS - rnd(DAYS));
    const u = await prisma.user.upsert({
      where: { phone }, update: {},
      create: { phone, role: 'CUSTOMER', name: pick(FIRST) + ' ' + pick(LAST), createdAt: joined },
    });
    await prisma.wallet.upsert({
      where: { userId_ownerType: { userId: u.id, ownerType: 'CUSTOMER' } }, update: {},
      create: { userId: u.id, ownerType: 'CUSTOMER' },
    });
    customers.push(u.id);
  }
  const asha = await prisma.user.findUnique({ where: { phone: '+919000000002' } });
  if (asha) customers.push(asha.id);

  // ── Bookings across the period ────────────────────────────────────────────
  const txns = []; // { userId, type, amount(signed), bookingId, createdAt }
  const agg = {};  // workerUserId -> { sum, count, completed }

  for (let i = 0; i < NUM_BOOKINGS; i++) {
    const w = pick(workers);
    const svc = pick(w.category.services);
    if (!svc) continue;
    const customerId = pick(customers);
    const age = rnd(DAYS);
    const created = daysAgo(age);
    const amount = svc.basePrice;
    const commission = Math.round((amount * w.category.defaultCommissionPct) / 100);
    const earning = amount - commission;
    const mode = chance(0.65) ? 'ONLINE' : 'CASH';

    let status;
    if (age <= 1) {
      status = pick(['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'SETTLED']);
    } else {
      const r = Math.random();
      status = r < 0.82 ? 'SETTLED' : r < 0.88 ? 'CANCELLED_BY_CUSTOMER' : r < 0.92 ? 'CANCELLED_BY_WORKER' : r < 0.96 ? 'EXPIRED' : 'DISPUTED';
    }
    const assigned = !['REQUESTED', 'EXPIRED'].includes(status);
    const priced = ['SETTLED', 'COMPLETED', 'DISPUTED'].includes(status);

    const b = await prisma.booking.create({
      data: {
        customerId,
        workerId: assigned ? w.profileId : null,
        serviceId: svc.id,
        status,
        paymentMode: mode,
        priceEstimate: amount,
        finalPrice: priced ? amount : null,
        commissionAmount: status === 'SETTLED' ? commission : 0,
        createdAt: created,
      },
    });

    const ev = [['requested', 0]];
    if (assigned) ev.push(['accepted', 5]);
    if (['EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'SETTLED', 'DISPUTED'].includes(status)) ev.push(['en_route', 20], ['in_progress', 45]);
    if (['COMPLETED', 'SETTLED', 'DISPUTED'].includes(status)) ev.push(['completed', 85]);
    if (status === 'SETTLED') ev.push(['settled', 95]);
    if (status === 'CANCELLED_BY_CUSTOMER') ev.push(['cancelled_by_customer', 12]);
    if (status === 'CANCELLED_BY_WORKER') ev.push(['cancelled_by_worker', 12]);
    if (status === 'EXPIRED') ev.push(['expired', 30]);
    if (status === 'DISPUTED') ev.push(['disputed', 130]);
    for (const [type, mins] of ev) {
      await prisma.bookingEvent.create({ data: { bookingId: b.id, type, createdAt: plus(created, mins) } });
    }

    if (status === 'SETTLED') {
      const payAt = plus(created, 90);
      await prisma.payment.create({
        data: {
          bookingId: b.id, provider: 'RAZORPAY', amount, status: 'PAID',
          method: mode === 'CASH' ? 'CASH' : pick(['UPI', 'UPI', 'CARD', 'NETBANKING']),
          providerPaymentId: 'seed_' + b.id.slice(0, 8), createdAt: payAt,
        },
      });
      txns.push(mode === 'ONLINE'
        ? { userId: w.userId, type: 'CREDIT', amount: earning, bookingId: b.id, createdAt: payAt }
        : { userId: w.userId, type: 'COMMISSION', amount: -commission, bookingId: b.id, createdAt: payAt });

      agg[w.userId] = agg[w.userId] || { sum: 0, count: 0, completed: 0 };
      agg[w.userId].completed++;
      if (chance(0.7)) {
        const rating = chance(0.75) ? 5 : chance(0.7) ? 4 : 3;
        const comment = pick(COMMENTS);
        await prisma.review.create({
          data: {
            bookingId: b.id, reviewerId: customerId, revieweeId: w.userId, rating, isVerified: true,
            comment: comment || undefined, createdAt: plus(created, 130),
          },
        });
        agg[w.userId].sum += rating;
        agg[w.userId].count++;
      }
    }

    if (status === 'DISPUTED') {
      await prisma.dispute.create({
        data: {
          bookingId: b.id, raisedById: customerId, status: pick(['OPEN', 'UNDER_REVIEW']),
          reason: pick(['Work left incomplete', 'Arrived very late', 'Quality not as expected']),
          createdAt: plus(created, 135),
        },
      });
    }
  }

  // ── Wallet ledgers (chronological running balance) + payouts ───────────────
  const byUser = {};
  for (const t of txns) (byUser[t.userId] = byUser[t.userId] || []).push(t);
  for (const userId of Object.keys(byUser)) {
    const list = byUser[userId].sort((a, b) => a.createdAt - b.createdAt);
    const wallet = await prisma.wallet.findUnique({ where: { userId_ownerType: { userId, ownerType: 'WORKER' } } });
    if (!wallet) continue;

    const credits = list.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const payoutAmt = credits > 300000 && chance(0.7) ? Math.round((credits * 0.4) / 100) * 100 : 0;
    const payoutAt = payoutAmt && list.length ? plus(list[Math.floor(list.length * 0.7)].createdAt, 1440) : null;

    const stream = [...list];
    if (payoutAt) stream.push({ userId, type: 'PAYOUT', amount: -payoutAmt, bookingId: null, createdAt: payoutAt });
    stream.sort((a, b) => a.createdAt - b.createdAt);

    let running = 0;
    for (const t of stream) {
      running += t.amount;
      await prisma.walletTransaction.create({
        data: { walletId: wallet.id, type: t.type, amount: t.amount, runningBalance: running, reference: t.bookingId || undefined, createdAt: t.createdAt },
      });
    }
    await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: running } });

    if (payoutAt) {
      const wp = await prisma.workerProfile.findUnique({ where: { userId } });
      if (wp) {
        await prisma.payout.create({
          data: { workerId: wp.id, amount: payoutAmt, status: pick(['PAID', 'PAID', 'PROCESSING']), requestedAt: payoutAt, processedAt: plus(payoutAt, 720) },
        });
      }
    }
  }

  // ── Recompute worker reputation ────────────────────────────────────────────
  for (const userId of Object.keys(agg)) {
    const a = agg[userId];
    const wp = await prisma.workerProfile.findUnique({ where: { userId } });
    if (!wp) continue;
    await prisma.workerProfile.update({
      where: { id: wp.id },
      data: {
        ratingAvg: a.count ? Number((a.sum / a.count).toFixed(2)) : wp.ratingAvg,
        ratingCount: (wp.ratingCount || 0) + a.count,
        completedJobs: (wp.completedJobs || 0) + a.completed,
        reliabilityScore: 88 + rnd(12),
      },
    });
  }

  // ── Geo + backdate updatedAt (raw; geography + camelCase columns) ──────────
  await prisma.$executeRawUnsafe(`UPDATE worker_profiles SET base_location = ST_SetSRID(ST_MakePoint(${CITY.lng} + (random()-0.5)*0.08, ${CITY.lat} + (random()-0.5)*0.08), 4326)::geography WHERE base_location IS NULL`);
  await prisma.$executeRawUnsafe(`UPDATE bookings SET location = ST_SetSRID(ST_MakePoint(${CITY.lng} + (random()-0.5)*0.10, ${CITY.lat} + (random()-0.5)*0.10), 4326)::geography WHERE location IS NULL`);
  await prisma.$executeRawUnsafe(`UPDATE bookings SET "updatedAt" = "createdAt" WHERE "createdAt" < now() - interval '1 day'`);
  await prisma.$executeRawUnsafe(`UPDATE payments SET "updatedAt" = "createdAt" WHERE "createdAt" < now() - interval '1 day'`);
  await prisma.$executeRawUnsafe(`UPDATE worker_profiles SET "updatedAt" = "createdAt" WHERE "createdAt" < now() - interval '1 day'`);
  await prisma.$executeRawUnsafe(`UPDATE users SET "updatedAt" = "createdAt" WHERE "createdAt" < now() - interval '1 day'`);

  await prisma.auditLog.create({ data: { action: MARKER, entity: 'system' } });

  const [users, bookings, paid] = await Promise.all([
    prisma.user.count(),
    prisma.booking.count(),
    prisma.payment.count({ where: { status: 'PAID' } }),
  ]);
  console.log(`History seed complete → users=${users}, bookings=${bookings}, paidPayments=${paid}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
