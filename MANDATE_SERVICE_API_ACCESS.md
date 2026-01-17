# Mandate Service API Access

## Issue: "INVALID_API_KEY" Error

When accessing `https://pure-wonder-production.up.railway.app/api/merchants`, you're getting:
```json
{"error":{"code":"INVALID_API_KEY","message":"API key is required"}}
```

## Root Cause

**The mandate service does NOT require API keys for authentication.**

The error suggests one of these issues:
1. **Wrong URL** - You might be hitting the backend service instead of mandate service
2. **Routing Issue** - Railway might be routing to the wrong service
3. **Service Not Deployed** - The mandate service might not be fully deployed

## Mandate Service API Endpoints

The mandate service (`pure-wonder`) has these endpoints **without authentication**:

### Merchants API
```
GET    /api/merchants          - List all merchants
POST   /api/merchants          - Create merchant
GET    /api/merchants/:id      - Get merchant by ID
PUT    /api/merchants/:id      - Update merchant
DELETE /api/merchants/:id      - Delete merchant
```

### AI Agent Apps API
```
GET    /api/ai-agent-apps      - List all AI agent apps
POST   /api/ai-agent-apps      - Create AI agent app
GET    /api/ai-agent-apps/:id  - Get AI agent app by ID
PUT    /api/ai-agent-apps/:id  - Update AI agent app
DELETE /api/ai-agent-apps/:id  - Delete AI agent app
```

### Health Check
```
GET    /health                  - Health check (no auth needed)
```

## Verification Steps

### Step 1: Test Health Endpoint

First, verify the service is running:

```bash
curl https://pure-wonder-production.up.railway.app/health
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "mandate-service"
}
```

If this doesn't work, the service isn't deployed or the domain is wrong.

### Step 2: Check Service Status

1. Go to Railway Dashboard
2. Navigate to service: **"pure-wonder"**
3. Check **Logs** tab - should show:
   ```
   🚀 Mandate Service running on port [PORT]
   📡 Environment: production
   ```

### Step 3: Verify Domain

Ensure you're using the correct domain for the mandate service:
- **Mandate Service:** `https://pure-wonder-production.up.railway.app`
- **Backend Service:** Different domain (check Railway Dashboard)

### Step 4: Test Merchants API (Without Auth)

```bash
curl https://pure-wonder-production.up.railway.app/api/merchants
```

**Expected response:**
```json
{
  "success": true,
  "data": []
}
```

If you get `INVALID_API_KEY`, you're hitting the **backend service**, not the mandate service.

## Backend Service vs Mandate Service

### Backend Service (Agentic Commerce)
- Requires **AP2 API key** authentication
- Uses `ap2-auth.middleware.ts`
- Different domain/URL
- Has different endpoints

### Mandate Service (Pure Wonder)
- **NO authentication required**
- No API keys needed
- Domain: `pure-wonder-production.up.railway.app`
- Provides merchant and AI agent app configuration

## Troubleshooting

### Issue 1: Service Not Running

**Symptoms:**
- Health endpoint doesn't respond
- 404 or connection error

**Solution:**
1. Check Railway Dashboard → Service "pure-wonder" → Logs
2. Verify deployment succeeded
3. Check if service is actually running

### Issue 2: Wrong Domain/Service

**Symptoms:**
- Getting `INVALID_API_KEY` error
- Health endpoint doesn't return mandate-service status

**Solution:**
1. Verify you're using the correct domain for mandate service
2. Check Railway Dashboard for exact domain
3. Don't mix backend service URL with mandate service

### Issue 3: Service Crashed on Startup

**Symptoms:**
- Deployment succeeded but service not responding
- Logs show errors

**Solution:**
1. Check Railway Dashboard → Service "pure-wonder" → Logs
2. Look for startup errors
3. Check `DATABASE_URL` environment variable is set
4. Verify database connection

## Quick Test

```bash
# Test health endpoint (should work without auth)
curl https://pure-wonder-production.up.railway.app/health

# Test merchants endpoint (should work without auth)
curl https://pure-wonder-production.up.railway.app/api/merchants

# Test AI agent apps endpoint (should work without auth)
curl https://pure-wonder-production.up.railway.app/api/ai-agent-apps
```

All of these should work **without API keys** on the mandate service.

## Summary

The mandate service (`pure-wonder`) **does NOT require API keys**. If you're getting `INVALID_API_KEY`:

1. ✅ Verify you're using the correct domain
2. ✅ Check service is running (test `/health`)
3. ✅ Ensure you're not accidentally hitting the backend service

The mandate service is designed for configuration management and doesn't require authentication for these endpoints.
