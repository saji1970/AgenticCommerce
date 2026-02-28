# Railway Environment Variables Setup

This document lists all environment variables required for each service when deploying to Railway, based on the codebase.

---

## Services Overview

| Service | Root Directory | Port | Railway Config |
|---------|----------------|------|----------------|
| **Backend** | `apps/backend` | 3000 | `apps/backend/railway.json` |
| **Mandate Service** | `apps/mandate-service` | 3001 | `apps/mandate-service/railway.json` |
| **Admin** | `apps/admin` | 5173 | `apps/admin/railway.json` (or built into mandate-service) |
| **Payment Gateway** | `apps/payment-gateway` | 3002 | No `railway.json` yet |

---

## 1. Backend (`apps/backend`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes (Railway sets) | Use Railway's `PORT` – defaults to 3000 |
| `DATABASE_URL` | Yes | PostgreSQL connection string (Railway provides) |
| `NODE_ENV` | No | `production` for deploy |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `CORS_ORIGIN` | Yes | Comma-separated frontend URLs (e.g. `https://yourapp.com`) |
| `API_URL` | No | Backend base URL (e.g. `https://backend.railway.app`) |
| `MANDATE_SERVICE_URL` | Yes | Mandate service URL (e.g. `https://mandate-service.railway.app/api`) |
| `MANDATE_SERVICE_ADMIN_TOKEN` | No | Admin token for mandate-service API calls |
| `ANTHROPIC_API_KEY` | Yes (for AI) | Claude API key |
| `ANTHROPIC_MODEL` | No | Default `claude-sonnet-4-20250514` |
| `GOOGLE_API_KEY` | No | Google Custom Search |
| `GOOGLE_SEARCH_ENGINE_ID` | No | Google Search Engine ID |
| `SERPAPI_KEY` | No | SerpAPI key |
| `RAPIDAPI_KEY` | No | RapidAPI (e.g. flights) |
| `MCP_CONFIG_PATH` | No | Path to MCP config |

**Fallback DB vars** (if `DATABASE_URL` not used): `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

---

## 2. Mandate Service (`apps/mandate-service`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes (Railway sets) | Use Railway's `PORT` – defaults to 3001 |
| `DATABASE_URL` | Yes | Same PostgreSQL as backend (shared DB) |
| `NODE_ENV` | No | `production` |
| `JWT_SECRET` | Yes | Must match backend/admin JWT secret |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `CORS_ORIGIN` | No | Default `*` |
| `BACKEND_DATABASE_URL` | No | Same as `DATABASE_URL` if shared |
| `BACKEND_API_URL` | No | Backend API base for admin stats |
| `ADMIN_TOKEN` | No | Token for backend admin API |
| `PAYMENT_GATEWAY_URL` | Yes (for VRP) | Payment gateway URL (e.g. `https://payment-gateway.railway.app`) |

**Note:** Mandate service builds and serves the Admin SPA from `apps/admin/dist`. For VRP admin to work, mandate-service must proxy `/api/admin` to `PAYMENT_GATEWAY_URL` (proxy not yet implemented).

---

## 3. Payment Gateway (`apps/payment-gateway`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes (Railway sets) | Use Railway's `PORT` – defaults to 3002 |
| `DATABASE_URL` | Yes | PostgreSQL (can share with backend/mandate-service) |
| `NODE_ENV` | No | `production` |
| `JWT_SECRET` | Yes | For user/agent tokens |
| `ADMIN_JWT_SECRET` | Yes | For admin tokens – **must equal mandate-service `JWT_SECRET`** so admin login token works |
| `JWT_EXPIRES_IN` | No | Default `7d` |

**Important:** `ADMIN_JWT_SECRET` must match mandate-service `JWT_SECRET` so the admin dashboard token works for VRP admin endpoints.

---

## 4. Admin (`apps/admin`)

When deployed as a **standalone** service (using `apps/admin/server.js`):

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes (Railway sets) | Default 5173 |
| `MANDATE_SERVICE_URL` | Yes | Mandate service base (e.g. `https://mandate-service.railway.app`) |

**Note:** Standalone admin proxies `/api` to mandate-service. For VRP, it would need `PAYMENT_GATEWAY_URL` and a proxy for `/api/admin` (not yet in `server.js`).

---

## Railway-Specific Notes

### Port binding
- Railway sets `PORT`; services must bind to `0.0.0.0` and use `process.env.PORT`.
- Backend and mandate-service already use `PORT`; payment-gateway uses `PORT` with default 3002.

### Root directory
- **Backend:** `apps/backend` (from `railway.json` start command)
- **Mandate Service:** `apps/mandate-service` (from `nixpacks.toml`)
- **Admin:** `apps/admin` (if standalone)
- **Payment Gateway:** `apps/payment-gateway` (no `railway.json` – add one if deploying)

### Database
- All services can share one PostgreSQL instance via `DATABASE_URL`.
- Payment gateway creates `vrp_consents` and `vrp_transactions` on startup if tables don’t exist.

### Service URLs (for cross-service calls)
- Backend → Mandate: `MANDATE_SERVICE_URL`
- Mandate → Payment Gateway: `PAYMENT_GATEWAY_URL`
- Admin → Mandate: `MANDATE_SERVICE_URL` (when standalone)

### JWT secrets
- **Backend:** `JWT_SECRET` – for main app auth
- **Mandate Service:** `JWT_SECRET` – for mandate + admin auth
- **Payment Gateway:** `JWT_SECRET` (user/agent), `ADMIN_JWT_SECRET` (admin) – set `ADMIN_JWT_SECRET` = mandate-service `JWT_SECRET`

---

## Minimal Railway Setup (Backend + Mandate)

```
# Backend
DATABASE_URL=<from Railway PostgreSQL>
PORT=3000
NODE_ENV=production
JWT_SECRET=<strong-secret>
CORS_ORIGIN=https://your-frontend.railway.app
MANDATE_SERVICE_URL=https://mandate-service.railway.app/api
ANTHROPIC_API_KEY=<your-key>

# Mandate Service
DATABASE_URL=<same-as-backend>
PORT=3001
NODE_ENV=production
JWT_SECRET=<same-as-backend>
PAYMENT_GATEWAY_URL=https://payment-gateway.railway.app  # if using VRP
```

---

## Adding Payment Gateway

1. Create a new Railway service from the same repo.
2. Set **Root Directory** to `apps/payment-gateway`.
3. Add a `railway.json` in `apps/payment-gateway` if needed.
4. Set env vars:
   - `DATABASE_URL` (same DB as backend/mandate)
   - `JWT_SECRET`
   - `ADMIN_JWT_SECRET` = mandate-service `JWT_SECRET`
5. Add `PAYMENT_GATEWAY_URL` to mandate-service pointing to the payment-gateway public URL.
6. Implement proxy in mandate-service: `/api/admin` → `PAYMENT_GATEWAY_URL/api/admin` so the admin SPA can call VRP endpoints.
