# KaarigarKo — Deployment guide

What gets deployed:

```
Managed Postgres + PostGIS   ─┐
Managed Redis                 ├─►  Backend API (Docker)  ──►  Web (Vercel)
                              ┘                            └─►  Mobile apps (EAS → App/Play stores)
```

The web and both mobile apps are thin clients of the **one** backend API, so the API (plus
its database and Redis) must be publicly reachable before the clients are useful. Everything
below uses managed services so there's nothing to operate yourself.

> Replace `api.kaarigarko.app` / domains / project names with your own throughout.

---

## 0. Prerequisites

- Accounts: a Postgres host (**Neon** or **Supabase**), **Upstash** (Redis), a container host
  (**Render**, **Railway**, or **Fly.io**), **Vercel** (web), and **Expo/EAS** (mobile).
- Razorpay + an SMS provider (MSG91/Twilio) for production payments & OTP (dev uses the mock
  provider + on-screen OTP).

---

## 1. Database — Postgres + PostGIS

1. Create a Postgres instance on **Neon** or **Supabase** (both support PostGIS).
2. Enable PostGIS — the `init` migration already runs `CREATE EXTENSION postgis`, but some hosts
   require enabling it from the dashboard first. On Supabase: Database → Extensions → enable `postgis`.
3. Copy the connection string → this is `DATABASE_URL`
   (e.g. `postgresql://user:pass@host/db?sslmode=require`).

## 2. Redis

1. Create an **Upstash** Redis database (TLS).
2. Copy the connection string → `REDIS_URL` (e.g. `rediss://default:pass@host:6379`).

## 3. Backend API (Docker)

The repo root has a production [`Dockerfile`](Dockerfile) (multi-stage; runs
`prisma migrate deploy` on boot, then starts Nest).

**Render** (example)
1. New → **Web Service** → from this repo → **Docker** runtime (root `Dockerfile`).
2. Set env vars (Settings → Environment):
   - `NODE_ENV=production`
   - `DATABASE_URL`, `REDIS_URL` (from steps 1–2)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (long random strings), `JWT_ACCESS_TTL=900`, `JWT_REFRESH_TTL=2592000`
   - `CORS_ORIGIN=https://<your-web-domain>` plus Payments/SMS/maps keys from `.env.example` as you enable them.
3. Deploy. The first boot applies migrations. Note the public URL → e.g. `https://kaarigarko-api.onrender.com`.
4. **Seed once** (optional, for catalog + GiST indexes): from the host's shell run
   `npm run db:seed` — or add the equivalent to a one-off job. (For production, prefer adding the
   GiST indexes as a real migration.)

> Railway/Fly.io are equivalent — point them at the `Dockerfile` and set the same env vars.

**Health check:** `GET https://<api-host>/api/v1/health` → `{ "status": "healthy" }`.

## 4. Web (Vercel)

1. Import the repo into **Vercel**, set **Root Directory = `web`** (it has [`vercel.json`](web/vercel.json)).
2. Env var: `VITE_API_URL = https://<api-host>/api/v1`.
3. Deploy. Vercel auto-builds the web app. (Realtime works automatically — the socket client
   derives its WebSocket URL from `VITE_API_URL`.)

## 5. Mobile apps (EAS)

Each app has an [`eas.json`](mobile/customer/eas.json) with `preview` and `production` profiles.
The API URL is read from `EXPO_PUBLIC_API_URL` (set per-profile in `eas.json`) and falls back to
`app.json → extra.apiUrl` for local dev.

```bash
npm i -g eas-cli && eas login
cd mobile/customer            # then repeat for mobile/worker
# set the real API URL in eas.json (production.env.EXPO_PUBLIC_API_URL)
eas build --profile preview --platform android      # internal test build (APK)
eas build --profile production --platform all       # store builds
eas submit  --profile production --platform all     # upload to App Store / Play
```

For push notifications later: add `expo-notifications`, configure FCM (Android) and APNs (iOS)
credentials in EAS, and POST the Expo/FCM token to `POST /me/devices` on login.

---

## 6. Production checklist

- [ ] **Secrets**: real, long `JWT_*` secrets; never commit `.env`.
- [ ] **CORS / sockets**: tighten `app.enableCors()` and the gateway `cors.origin` to your web domain.
- [ ] **Payments**: set `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET`; point the Razorpay webhook at
      `https://<api-host>/api/v1/payments/webhook`. The provider auto-switches from mock → Razorpay
      when `RAZORPAY_KEY_ID` is present.
- [ ] **SMS/OTP**: implement a real `SmsService` (MSG91/Twilio) and complete India **DLT** template
      registration. Dev `devOtp` is disabled automatically when `NODE_ENV=production`.
- [ ] **KYC**: integrate a licensed KYC provider; do not store raw IDs (spec §0/§14).
- [ ] **Scale**: add the **Socket.IO Redis adapter** for multi-instance, and move settlement/payout
      processing to **BullMQ** (Redis is already provisioned).
- [ ] **Migrations**: add the PostGIS GiST indexes (currently created by the seed) as a migration.
- [ ] **Observability**: wire Sentry DSN (`SENTRY_DSN`) across API + web + mobile.
