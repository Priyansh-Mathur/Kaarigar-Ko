-- PostGIS GiST indexes for geospatial queries ("workers near me").
-- These columns are Unsupported("geography(Point,4326)") in the Prisma schema,
-- so their indexes are declared here as raw SQL rather than in schema.prisma.

CREATE INDEX IF NOT EXISTS "worker_profiles_base_location_idx" ON "worker_profiles" USING GIST ("base_location");
CREATE INDEX IF NOT EXISTS "bookings_location_idx" ON "bookings" USING GIST ("location");
CREATE INDEX IF NOT EXISTS "addresses_location_idx" ON "addresses" USING GIST ("location");
