# KaarigarKo — Web

The KaarigarKo web frontend: a marketing site, a customer booking app, and an admin
dashboard — built with **Next.js 15 (App Router)**, **React 19**, **TypeScript** and
**Tailwind CSS**, wired to the KaarigarKo API.

## Run

The backend API must be running first (see the root README — `docker compose up -d` then
`npm run start:dev` in the project root). Then:

```bash
cd web
npm install
npm run dev      # http://localhost:3001
```

`VITE_API_URL` (in `.env.local`) points at `http://localhost:3000/api/v1`.

## What's inside

- **Marketing** (`/`) — hero, services, how-it-works, become-a-pro.
- **Auth** (`/login`) — phone-OTP. In dev the API returns the code and the form pre-fills it.
- **Customer app** (`/app`)
  - Home — live category grid + recent bookings
  - Book (`/app/book`) — choose service → location → payment → confirm (auto-assigns the
    nearest verified pro)
  - Bookings + detail — status timeline, live polling, pay (mock/Razorpay), rate & review
  - Wallet — balance + ledger
- **Admin** (`/admin`, role OPS_ADMIN / SUPER_ADMIN)
  - Overview — GMV, revenue, bookings-by-status, workers, disputes
  - Bookings monitor, KYC queue (approve/reject), Disputes (refund/dismiss), Workers (feature)

## Design system

`src/components/ui.tsx` (Button, Input, Card, Badge, StatusBadge, EmptyState, Avatar, Skeleton,
Spinner) + tokens in `tailwind.config.ts` and `globals.css`. Brand indigo + amber accent,
soft shadows, rounded-2xl surfaces, skeleton loaders, accessible focus rings.

## Demo logins

| Role     | Phone           |
| -------- | --------------- |
| Admin    | `+919000000001` |
| Customer | `+919000000002` |
| Worker   | `+919000000003` |
