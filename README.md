# Oddnext

Sports betting predictions platform for Ghana and Nigeria: daily free football tips, a GHS 40 VIP tier, JWT auth, an admin CMS, and Moolre checkout.

## Stack

- **Frontend:** Next.js (App Router) on Vercel
- **Backend:** Express + Mongoose on Render
- **Database:** MongoDB Atlas
- **Payments:** Moolre hosted payment link + webhook + server-side verify

## Local setup

### 1. Prerequisites

- Node.js 20+
- MongoDB locally, Docker, or an Atlas connection string

### 2. Install

```bash
npm install
```

### 3. Environment

Copy the examples:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

On macOS/Linux use `cp` instead of `copy`.

`backend/.env` minimum:

```
MONGODB_URI=mongodb://127.0.0.1:27017/oddnext
JWT_SECRET=change-this-to-a-long-random-string
FRONTEND_URL=http://localhost:3000
```

Leave Moolre keys empty in development. Checkout then uses a local simulate return page so you can test VIP upgrades without live Mobile Money.

### 4. Seed and run

```bash
npm run seed
npm run dev:backend
npm run dev:frontend
```

In development the API also seeds demo users and tips automatically when the database is empty.

- Site: http://localhost:3000
- API: http://localhost:4000/api/health
- Admin: http://localhost:3000/admin (hidden from the public nav)

Seeded accounts:

| Role  | Email                 | Password   |
| ----- | --------------------- | ---------- |
| Admin | admin@system.com      | admin1234  |
| User  | user@oddnext.com      | User123!   |
| VIP   | vip@oddnext.com       | Vip123!    |

## Moolre (production)

1. Create a Moolre account and enable the API.
2. Set on the API service:

```
MOOLRE_API_USER=
MOOLRE_PUBLIC_KEY=
MOOLRE_ACCOUNT_NUMBER=
MOOLRE_WEBHOOK_SECRET=
MOOLRE_BASE_URL=https://api.moolre.com
```

3. Point the Moolre callback to `https://<your-api-host>/api/payments/webhook`.
4. Customer redirect is `https://<your-frontend>/payment/return?reference=<externalRef>`.

The API never upgrades VIP from the webhook or redirect alone. It re-checks `POST /open/transact/status`, then matches `externalRef`, amount, and account number before extending `vipExpiresAt` by 30 days.

Sandbox: `MOOLRE_BASE_URL=https://sandbox.moolre.com`.

## Deploy

### MongoDB Atlas

Create a cluster, allow the Render outbound IP (or `0.0.0.0/0` while testing), and paste the URI into `MONGODB_URI`.

### Backend (Render)

- Root: `backend`
- Build: `npm install && npm run build`
- Start: `npm start`
- Env: all `backend/.env.example` keys, plus `FRONTEND_URL=https://<vercel-domain>` and `NODE_ENV=production`

### Frontend (Vercel)

- Root: `frontend`
- Env:
  - `NEXT_PUBLIC_API_URL=https://<render-api>`
  - `NEXT_PUBLIC_SITE_URL=https://<vercel-domain>`
  - `NEXT_PUBLIC_BRAND_NAME=Oddnext`

## Product notes

- Tips tabs: Yesterday, Today, VIP. VIP rows stay redacted unless the JWT user is an active VIP or admin.
- Booking codes render under match clusters that share the same code.
- Match results are settled manually in `/admin`.
- Telegram member count is edited in admin stats (no bot sync in v1).
- 18+ / responsible gambling copy is in the footer.

## API surface

- `POST /api/auth/register` `POST /api/auth/login` `GET /api/auth/me`
- `GET /api/tips?tab=yesterday|today|vip`
- `GET /api/stats`
- `POST /api/payments/initiate`
- `POST /api/payments/webhook`
- `GET /api/payments/verify/:ref`
- `POST /api/payments/simulate` (development only)
- Admin: `/api/admin/tips` CRUD, `/api/admin/users`, `/api/admin/users/:id/vip`, `/api/admin/stats`
