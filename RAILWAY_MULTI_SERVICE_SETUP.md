# Railway Multi-Service Deployment Guide

This guide explains how to deploy both the shopping app backend and mandate service as separate services in the same Railway project.

## Architecture

```
Railway Project
├── Service 1: Shopping App Backend (apps/backend)
│   └── Port: 3000 (default)
└── Service 2: Mandate Service (apps/mandate-service)
    └── Port: 3001
```

Both services share the same PostgreSQL database.

## Setup Steps

### Step 1: Add Mandate Service in Railway Dashboard

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"GitHub Repo"** (or **"Empty Service"** if already connected)
3. Select the same repository
4. Railway will detect it's the same repo - that's fine!

### Step 2: Configure Service Settings

For the **Mandate Service**:

1. Go to the service settings
2. Set **Root Directory** to: `apps/mandate-service`
3. Set **Start Command** to: `cd apps/mandate-service && npm run start`

Or Railway will auto-detect from `railway.json`.

### Step 3: Configure Environment Variables

#### For Shopping App Backend Service:
```
DATABASE_URL=<shared-database-url>
PORT=3000
NODE_ENV=production
JWT_SECRET=<your-secret>
CORS_ORIGIN=<your-frontend-url>
# ... other backend env vars
```

#### For Mandate Service:
```
DATABASE_URL=<same-shared-database-url>
MANDATE_SERVICE_PORT=3001
NODE_ENV=production
JWT_SECRET=<your-secret>
CORS_ORIGIN=*
```

**Important**: Both services use the **same `DATABASE_URL`** to share the database.

### Step 4: Run Migrations

Run the mandate service migrations on the shared database:

```bash
# Option 1: Using Railway CLI
railway run --service mandate-service psql $DATABASE_URL -f migrations/001_create_merchants_table.sql
railway run --service mandate-service psql $DATABASE_URL -f migrations/002_create_ai_agent_apps_table.sql

# Option 2: Connect to database directly
psql $DATABASE_URL -f apps/mandate-service/migrations/001_create_merchants_table.sql
psql $DATABASE_URL -f apps/mandate-service/migrations/002_create_ai_agent_apps_table.sql
```

### Step 5: Configure Service URLs

#### In Shopping App Backend:

Add environment variable to connect to mandate service:

```
MANDATE_SERVICE_URL=https://mandate-service-production.up.railway.app
```

Or use Railway's internal service discovery (if both services are in the same project):

```typescript
// In shopping app backend
const MANDATE_SERVICE_URL = process.env.MANDATE_SERVICE_URL 
  || 'http://mandate-service:3001'; // Internal service name
```

### Step 6: Generate Public URLs (Optional)

1. Go to each service in Railway
2. Click **"Settings"** → **"Generate Domain"**
3. This creates public URLs like:
   - `https://shopping-backend-production.up.railway.app`
   - `https://mandate-service-production.up.railway.app`

## Service Configuration Files

### Shopping App Backend
- **Root Directory**: `apps/backend`
- **Config File**: `apps/backend/railway.json`
- **Start Command**: `cd apps/backend && npm run start`

### Mandate Service
- **Root Directory**: `apps/mandate-service`
- **Config File**: `apps/mandate-service/railway.json`
- **Start Command**: `cd apps/mandate-service && npm run start`

## Railway Auto-Detection

Railway will automatically detect:
- `railway.json` files in subdirectories
- `nixpacks.toml` files for build configuration
- `package.json` files to determine Node.js services

## Internal Service Communication

If both services are in the same Railway project, they can communicate internally:

```typescript
// In shopping app backend
const MANDATE_SERVICE_URL = process.env.MANDATE_SERVICE_URL 
  || 'http://mandate-service:3001';
```

Railway provides internal DNS names based on service names.

## Environment Variables Setup

### Shared Variables (Both Services)
- `DATABASE_URL` - Same PostgreSQL database

### Shopping App Backend Only
- `PORT=3000`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `GOOGLE_API_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `MANDATE_SERVICE_URL` - URL to mandate service

### Mandate Service Only
- `MANDATE_SERVICE_PORT=3001`
- `JWT_SECRET` (can be same or different)
- `CORS_ORIGIN=*`

## Testing the Setup

### 1. Check Shopping App Backend
```bash
curl https://shopping-backend-production.up.railway.app/health
```

### 2. Check Mandate Service
```bash
curl https://mandate-service-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "mandate-service"
}
```

### 3. Test Merchant API
```bash
curl https://mandate-service-production.up.railway.app/api/merchants
```

### 4. Test AI Agent Apps API
```bash
curl https://mandate-service-production.up.railway.app/api/ai-agent-apps
```

## Troubleshooting

### Service Not Starting

1. Check logs in Railway dashboard
2. Verify `DATABASE_URL` is set correctly
3. Ensure migrations have been run
4. Check that `MANDATE_SERVICE_PORT` is set (defaults to 3001)

### Services Can't Communicate

1. Use Railway's internal service names: `http://mandate-service:3001`
2. Or use public URLs: `https://mandate-service-production.up.railway.app`
3. Set `MANDATE_SERVICE_URL` environment variable in shopping app backend

### Database Connection Issues

1. Both services must use the **same** `DATABASE_URL`
2. Ensure PostgreSQL service is running
3. Check database credentials are correct

## Cost Considerations

- Each service in Railway is billed separately
- Both services share the same database (one database cost)
- Consider using Railway's free tier for development

## Next Steps

1. Deploy both services
2. Run migrations
3. Configure environment variables
4. Test service communication
5. Set up monitoring and alerts
