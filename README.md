# KaarigarKo

**An on-demand home-services marketplace for India — book a verified local pro (electrician, plumber, cleaner, carpenter…), track them live, and pay by UPI or cash.**

![Node](https://img.shields.io/badge/Node-%E2%89%A520-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20PostGIS-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-SDK%2052-000020?logo=expo&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)
![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)

> A monorepo: **one** Express API serves **two** native mobile apps (customer + worker) and a Next.js ops console. Live API: `https://KaarigarKo-api.onrender.com/api/v1` · health: [`/api/v1/health`](https://KaarigarKo-api.onrender.com/api/v1/health).

---

## Overview

KaarigarKo connects **customers** who need a home service with nearby **workers** ("pros"). A customer books a job; the backend matches the nearest online, KYC-verified pro using PostGIS radius search; the pro moves the job through a strict lifecycle (`accepted → en route → in progress → completed`); payment settles (UPI/cash) with a platform commission credited against the worker's wallet; both sides leave a verified review. **Ops staff** approve KYC, resolve disputes, and manage payouts from a web console.

It's a real two-sided, real-time marketplace with an escrow-style money layer — built deliberately lightweight (a build-free plain-JS API) so it runs on free-tier infra.

## Features

- **Passwordless auth** — phone OTP → JWT access + rotating refresh tokens (Redis-backed revocation).
- **Geospatial matching** — nearest online + verified pro via PostGIS `ST_DWithin` / `ST_Distance`.
- **Booking state machine** — 11 states, forward-only worker transitions, full event timeline.
- **Payments** — UPI QR (zero-gateway), Razorpay (auto-enabled when keyed), idempotent webhooks.
- **Money system** — configurable commission rules, append-only wallet ledger, worker payouts.
- **Real-time** — Socket.IO rooms for live status, location tracking, and in-booking chat.
- **Notifications** — in-app + Expo push fan-out.
- **Trust & safety** — worker KYC, verified reviews, disputes, reliability scoring, SOS.
- **Growth** — referral codes with two-sided wallet rewards.
- **Admin** — analytics, user/worker/booking management, KYC & dispute queues, audit logs.

## Tech stack

| Area | Stack |
| --- | --- |
| **Backend** | Node ≥ 20, Express 5, plain JavaScript (no build step), Zod 3, `jsonwebtoken` 9, `qrcode` |
| **Data** | PostgreSQL 16 + PostGIS 3.4, Prisma 6 (raw SQL for geography columns), Redis 7 (`ioredis`) |
| **Realtime** | Socket.IO 4.8 |
| **Mobile** | React Native 0.76 / Expo SDK 52, React Navigation 7, `expo-secure-store`, `expo-notifications`, `expo-location` |
| **Web** | Next.js 15 (App Router), React 19, Tailwind 3.4, `lucide-react`, `socket.io-client` |
| **Infra** | Docker (`node:22-alpine`), Render (API), Vercel (web), EAS (mobile), Supabase/Neon (Postgres), Upstash (Redis) |

## Architecture

The API is the single source of truth; every client speaks the same `/api/v1` JSON envelope (`{ data, error, meta }`) and the same Socket.IO gateway. The backend is organized as one router/service/schema module per domain.

```
 mobile/customer ─┐
 mobile/worker   ─┤   HTTPS + WSS    ┌──────────────────────────────┐
 web (ops)       ─┴───────────────► │  KaarigarKo API (Express 5)  │
                                    │  auth · bookings · payments  │      ┌─ Socket.IO ─┐
                                    │  money · workers · kyc ·     │◀────▶│ user:<id>   │
                                    │  reviews · disputes · admin  │      │ booking:<id>│
                                    └───────┬───────────┬──────────┘      └─────────────┘
                                            │           │
                                   ┌────────▼───┐  ┌────▼─────┐
                                   │ PostgreSQL │  │  Redis   │
                                   │ + PostGIS  │  │ OTP, jti │
                                   └────────────┘  └──────────┘
```

📖 **Deep dive:** [`docs/KaarigarKo-Developer-Notes.html`](docs/KaarigarKo-Developer-Notes.html) (also as [PDF](docs/KaarigarKo-Developer-Notes.pdf)) — a full, function-by-function developer guide. Backend API reference (endpoint catalog): [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md).

## Getting started

### Prerequisites

- **Node.js ≥ 20** (the API Docker image uses Node 22) — runs the API, web, and Expo tooling.
- **Docker Desktop** — the easiest way to run local PostgreSQL + PostGIS and Redis (`docker-compose.yml`).
- **A phone with Expo Go** or an Android emulator — to run the mobile apps. (For native release builds: **JDK 17** + Android SDK.)

### 1. Backend API

```bash
# from the repo root
docker compose up -d            # PostgreSQL (+PostGIS) on :5432 and Redis on :6379
cp .env.example .env            # then set JWT_ACCESS_SECRET / JWT_REFRESH_SECRET (see table below)

npm install
npm run prisma:generate         # generate the Prisma client
npm run prisma:migrate          # apply migrations to the local DB
npm run db:seed                 # seed catalog + demo accounts (categories, services, users)

npm run dev                     # API on http://localhost:3000/api/v1  (node --watch)
```

Check it: `curl http://localhost:3000/api/v1/health` → `{ "data": { "status": "healthy", ... } }`.

<details>
<summary>All backend scripts (from <code>package.json</code>)</summary>

| Script | Does |
| --- | --- |
| `npm run dev` | Start the API with file-watch (`node --watch server/server.js`) |
| `npm start` | Start the API |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | `prisma migrate dev` (local) |
| `npm run prisma:deploy` | `prisma migrate deploy` (prod/CI) |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed catalog + demo accounts (`ts-node prisma/seed.ts`) |
| `npm run db:seed:history` | Backfill ~2 months of demo activity |
| `npm run db:reset` | Reset the database |
</details>

### 2. Mobile apps (Expo)

Two separate apps share an identical `src/` library; run whichever you need. They default to the live Render API via `app.json → extra.apiUrl`, so they work even without a local backend.

```bash
cd mobile/customer          # or:  cd mobile/worker
npm install
npx expo start              # press 'a' (Android), 'i' (iOS), or scan the QR with Expo Go
```

**Demo logins** — the dev OTP is shown on-screen (no SMS provider needed):

| App | Phone | Seeded as |
| --- | --- | --- |
| Customer app | `+919000000002` | Asha (CUSTOMER) |
| Worker app | `+919000000003` | Ravi (WORKER) |
| Web ops console | `+919000000001` | SUPER_ADMIN |

> Pointing the apps at a **local** API? `localhost` on a phone is the phone itself. Set `app.json → extra.apiUrl` to your machine's LAN IP (`http://192.168.x.x:3000/api/v1`) or `http://10.0.2.2:3000/api/v1` for the Android emulator. See [`mobile/README.md`](mobile/README.md) for details.

<details>
<summary>Native release APK (local build, Windows)</summary>

Each app is a prebuilt Expo project. To build an installable release APK locally:

```bash
cd mobile/customer/android       # or mobile/worker/android
./gradlew assembleRelease        # output: app/build/outputs/apk/release/app-release.apk
```

Requires **JDK 17** + Android SDK. The icon font (`ionicons.ttf`) is embedded under `android/app/src/main/assets/fonts/` (lowercase — Android asset lookup is case-sensitive) and `android/build.gradle` pins Kotlin `1.9.25`. Or build in the cloud with EAS (see [Deployment](#deployment)).
</details>

### 3. Web ops console (Next.js)

```bash
cd web
npm install
echo "VITE_API_URL=http://localhost:3000/api/v1" > .env.local
npm run dev                 # web on http://localhost:3001
```

## Environment variables

Copy [`.env.example`](.env.example) → `.env`. Only the core block is required for local dev; the rest enable production integrations.

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | no | `development` (default) / `production` |
| `PORT` | no | API port (default `3000`) |
| `DATABASE_URL` | **yes** | PostgreSQL + PostGIS connection string |
| `REDIS_URL` | no* | Redis URL (default `redis://localhost:6379`) — needed in practice for OTP / refresh / live tracking |
| `JWT_ACCESS_SECRET` | **yes (prod)** | Signs short-lived access tokens (unsafe dev default if unset) |
| `JWT_REFRESH_SECRET` | **yes (prod)** | Signs rotating refresh tokens (unsafe dev default if unset) |
| `JWT_ACCESS_TTL` | no | Access token lifetime, seconds (default `900`) |
| `JWT_REFRESH_TTL` | no | Refresh token lifetime, seconds (default `2592000`) |
| `RAZORPAY_KEY_ID` / `_SECRET` / `_WEBHOOK_SECRET` | no | When set, the payment provider auto-switches mock → Razorpay |
| `UPI_VPA` / `UPI_PAYEE_NAME` | no | UPI VPA + display name baked into the UPI-QR deep link |
| `GOOGLE_MAPS_API_KEY_*` | no | Maps keys (server / Android / iOS) |
| `FIREBASE_*`, `SMS_PROVIDER_KEY`, `WHATSAPP_API_KEY` | no | Notification / SMS providers (Expo push works without these) |
| `CLOUDINARY_*` | no | Media uploads |
| `SENTRY_DSN`, `POSTHOG_KEY` | no | Observability |

> **Never commit `.env`.** The `JWT_*` secrets fall back to `dev_*_change_me` defaults if unset — fine locally, unsafe in production.

## Project structure

```
KaarigarKo/
├── server/            # Express 5 API — one folder per domain (router + service + schemas)
│   ├── auth/  bookings/  payments/  money/  workers/  kyc/  reviews/
│   ├── disputes/  referrals/  chat/  notifications/  realtime/  admin/
│   ├── config/        # env (zod), prisma client, redis client
│   ├── lib/           # response envelope, asyncHandler, zod validate
│   ├── middleware/    # requireAuth / requireRoles, error handler
│   └── server.js      # HTTP + Socket.IO bootstrap
├── prisma/            # schema.prisma (PostGIS), migrations, seeds
├── mobile/
│   ├── customer/      # Expo app — book, track, pay, review, wallet
│   └── worker/        # Expo app — jobs, earnings, KYC, live location
├── web/               # Next.js 15 ops console (admin + customer-style views)
├── docs/              # Developer guide (HTML/PDF) + backend API reference
├── Dockerfile         # production API image (no build step)
├── render.yaml        # Render blueprint for the API
└── docker-compose.yml # local Postgres (PostGIS) + Redis
```

## Deployment

| Piece | Where | Config |
| --- | --- | --- |
| **API** | Render (Docker) | [`render.yaml`](render.yaml) + [`Dockerfile`](Dockerfile) — runs `prisma migrate deploy` on boot; health check `/api/v1/health` |
| **Database** | Supabase / Neon (Postgres + PostGIS) | `DATABASE_URL` (`sync: false` in Render) |
| **Redis** | Upstash (TLS `rediss://`) | `REDIS_URL` (`sync: false` in Render) |
| **Web** | Vercel (root dir `web/`) | [`web/vercel.json`](web/vercel.json) — set `NEXT_PUBLIC_API_URL` |
| **Mobile** | Expo EAS → Play / App stores | [`mobile/*/eas.json`](mobile/customer/eas.json) — `preview` (APK) / `production` profiles |

Full step-by-step: [`DEPLOY.md`](DEPLOY.md).

> **Note:** the Render free tier sleeps after ~15 min idle, so the first request after idle can take 30–60 s (cold start) — the clients tolerate this.

## Status & honest scope

This is a feature-complete demo with deliberate, documented shortcuts so it runs at zero cost:

- **OTP** returns `devOtp` only in non-production, so local demos still auto-fill codes but production responses do not leak them.
- **Payments** use Razorpay in production when `RAZORPAY_*` is set; the manual UPI QR / confirm path is demo-only.
- **CORS** is allowlisted via `CORS_ORIGIN` instead of being open to `*`.
- Real-time uses **in-memory** Socket.IO rooms — add the Redis adapter before running more than one API instance.

The production hardening checklist lives in [`DEPLOY.md`](DEPLOY.md) §6.

## License

**Proprietary — UNLICENSED.** This repository is private (`"private": true`, `"license": "UNLICENSED"` in `package.json`); no usage rights are granted. © Priyansh Mathur.

## Credits

Built by **Priyansh Mathur**.
GitHub: https://github.com/Priyansh-Mathur/Kaarigar-Ko
