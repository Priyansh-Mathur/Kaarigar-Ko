import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Prices are in paise (integer minor units). e.g. 19900 = ₹199.00
const CATALOG = [
  {
    slug: 'electrician',
    name: 'Electrician',
    commission: 15,
    services: [
      { name: 'Switch & Socket Repair', duration: 45, price: 19900 },
      { name: 'Wiring Installation', duration: 120, price: 99900 },
    ],
  },
  {
    slug: 'plumber',
    name: 'Plumber',
    commission: 15,
    services: [
      { name: 'Tap & Pipe Leak Fix', duration: 45, price: 24900 },
      { name: 'Bathroom Fittings', duration: 90, price: 79900 },
    ],
  },
  {
    slug: 'cleaner',
    name: 'Cleaner',
    commission: 12,
    services: [
      { name: 'Home Deep Cleaning', duration: 180, price: 149900 },
      { name: 'Bathroom Cleaning', duration: 60, price: 49900 },
    ],
  },
  {
    slug: 'carpenter',
    name: 'Carpenter',
    commission: 15,
    services: [{ name: 'Furniture Repair', duration: 90, price: 59900 }],
  },
  {
    slug: 'painter',
    name: 'Painter',
    commission: 15,
    services: [{ name: 'Wall Painting (per room)', duration: 240, price: 299900 }],
  },
  {
    slug: 'ac-technician',
    name: 'AC Technician',
    commission: 18,
    services: [{ name: 'AC Service & Gas Refill', duration: 90, price: 59900 }],
  },
  {
    slug: 'pest-control',
    name: 'Pest Control',
    commission: 18,
    services: [{ name: 'General Pest Control', duration: 120, price: 129900 }],
  },
  {
    slug: 'appliance-repair',
    name: 'Appliance Repair',
    commission: 18,
    services: [{ name: 'Washing Machine Repair', duration: 90, price: 49900 }],
  },
];

async function main() {
  console.log('Seeding KaarigarKo…');

  // PostGIS GiST indexes for geo columns (idempotent; Prisma can't declare these on Unsupported types).
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS worker_profiles_base_location_idx ON worker_profiles USING GIST (base_location);`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS bookings_location_idx ON bookings USING GIST (location);`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS addresses_location_idx ON addresses USING GIST (location);`,
  );

  // Global commission rule (default 15%)
  const globalRule = await prisma.commissionRule.findFirst({ where: { scope: 'GLOBAL' } });
  if (!globalRule) {
    await prisma.commissionRule.create({ data: { scope: 'GLOBAL', pct: 15 } });
  }

  // Categories + services
  for (const [i, c] of CATALOG.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, defaultCommissionPct: c.commission, sortOrder: i },
      create: { slug: c.slug, name: c.name, defaultCommissionPct: c.commission, sortOrder: i },
    });

    for (const s of c.services) {
      const existing = await prisma.service.findFirst({
        where: { categoryId: category.id, name: s.name },
      });
      if (!existing) {
        await prisma.service.create({
          data: {
            categoryId: category.id,
            name: s.name,
            defaultDurationMin: s.duration,
            basePrice: s.price,
          },
        });
      }
    }
  }

  // Users
  const admin = await prisma.user.upsert({
    where: { phone: '+919000000001' },
    update: {},
    create: {
      phone: '+919000000001',
      role: 'SUPER_ADMIN',
      name: 'KaarigarKo Admin',
      email: 'admin@kaarigarko.app',
    },
  });

  const customer = await prisma.user.upsert({
    where: { phone: '+919000000002' },
    update: {},
    create: { phone: '+919000000002', role: 'CUSTOMER', name: 'Asha Customer' },
  });

  const workerUser = await prisma.user.upsert({
    where: { phone: '+919000000003' },
    update: {},
    create: { phone: '+919000000003', role: 'WORKER', name: 'Ravi Electrician' },
  });

  // Worker profile
  let workerProfile = await prisma.workerProfile.findUnique({ where: { userId: workerUser.id } });
  if (!workerProfile) {
    workerProfile = await prisma.workerProfile.create({
      data: {
        userId: workerUser.id,
        bio: 'Certified electrician with 8 years of experience.',
        yearsExperience: 8,
        serviceRadiusKm: 12,
        availabilityStatus: 'ONLINE',
        kycStatus: 'APPROVED',
        ratingAvg: 4.7,
        ratingCount: 42,
        completedJobs: 120,
      },
    });
  }

  // Worker skill (electrician)
  const electrician = await prisma.category.findUnique({ where: { slug: 'electrician' } });
  if (electrician) {
    await prisma.workerSkill.upsert({
      where: { workerId_categoryId: { workerId: workerProfile.id, categoryId: electrician.id } },
      update: {},
      create: {
        workerId: workerProfile.id,
        categoryId: electrician.id,
        priceType: 'FIXED',
        basePrice: 19900,
      },
    });
  }

  // Worker base location (Jabalpur ≈ lng 79.9864, lat 23.1815) — set via PostGIS
  await prisma.$executeRawUnsafe(
    `UPDATE worker_profiles SET base_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
    79.9864,
    23.1815,
    workerProfile.id,
  );

  // Wallets
  await prisma.wallet.upsert({
    where: { userId_ownerType: { userId: workerUser.id, ownerType: 'WORKER' } },
    update: {},
    create: { userId: workerUser.id, ownerType: 'WORKER' },
  });
  await prisma.wallet.upsert({
    where: { userId_ownerType: { userId: customer.id, ownerType: 'CUSTOMER' } },
    update: {},
    create: { userId: customer.id, ownerType: 'CUSTOMER' },
  });

  console.log('Seed complete:');
  console.log(`  admin    → ${admin.phone}`);
  console.log(`  customer → ${customer.phone}`);
  console.log(`  worker   → ${workerUser.phone}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
