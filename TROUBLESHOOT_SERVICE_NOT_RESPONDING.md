# Troubleshoot: Service Not Responding - "Cannot GET /health"

## Error
```
curl : Cannot GET /health
```

This means the service is not responding at the `/health` endpoint.

## Possible Causes

### 1. Build Never Completed (Timed Out)
The build was timing out because Railway was trying to start the server during build phase instead of deploy phase.

### 2. Service Not Running
The service might have crashed on startup or never started.

### 3. Wrong Domain/Service
The domain might be pointing to the wrong service or not deployed.

### 4. Service Listening on Wrong Port
The service might not be using Railway's PORT environment variable correctly.

## Step-by-Step Troubleshooting

### Step 1: Check Deployment Status

1. **Go to Railway Dashboard**
   - https://railway.app/dashboard
   - Navigate to service: **"pure-wonder"**

2. **Check Deployments Tab**
   - Go to **"Deployments"** tab
   - Check latest deployment status:
     - ✅ **Success** = Deployment completed
     - ❌ **Failed** = Deployment failed (check logs)
     - ⏳ **Building** = Still building (might have timed out)

3. **Check if Build Timed Out**
   - If build shows "timed out" or is stuck
   - This means the build phase never completed

### Step 2: Check Service Logs

1. **Go to Logs Tab**
   - Service "pure-wonder" → **"Logs"**

2. **Look for These Messages**

   **✅ Service Running:**
   ```
   🚀 Mandate Service running on port [PORT]
   📡 Environment: production
   🔗 Health check: http://localhost:[PORT]/health
   ```

   **❌ Service Not Running:**
   - No service start messages
   - Error messages (database connection, missing env vars, etc.)
   - "Build timed out" messages

### Step 3: Check Build Configuration

**The build was timing out because:**
- Railway Railpack was running `cd apps/mandate-service && npm run start` during **build phase**
- This starts the server during build → Build hangs/timeouts

**Fix Required in Railway Dashboard:**
1. Settings → Build & Deploy
2. **Build Command:** Leave blank (postinstall already builds)
3. **Start Command:** `cd apps/mandate-service && node dist/server.js`
4. Save and Redeploy

### Step 4: Verify Environment Variables

1. **Go to Variables Tab**
   - Service "pure-wonder" → **"Variables"**

2. **Check Required Variables:**
   - `DATABASE_URL` - Should be set (service might crash if missing)
   - `PORT` - Railway sets this automatically
   - `NODE_ENV` - Optional (defaults to development)

### Step 5: Check if Service Started

**In Logs, look for:**
- ✅ `🚀 Mandate Service running` = Service started
- ❌ `Error:` or `Failed to` = Service crashed

## Quick Fix: Reconfigure Build/Start Commands

Since the build was timing out, you need to configure Railway to:

1. **NOT start server during build**
2. **Start server only during deploy**

### Option 1: Configure in Railway Dashboard (Recommended)

1. Railway Dashboard → Service "pure-wonder" → **Settings**
2. **Build & Deploy** section:
   - **Build Command:** (leave blank or `echo "Build completed"`)
   - **Start Command:** `cd apps/mandate-service && node dist/server.js`
3. **Save** and **Redeploy**

### Option 2: Force Nixpacks

1. Railway Dashboard → Service "pure-wonder" → **Settings**
2. **Build & Deploy** section:
   - **Builder:** Change from "Railpack" to "Nixpacks"
   - This will use `nixpacks.toml` which has correct build/start separation
3. **Save** and **Redeploy**

## Verification After Fix

After fixing build configuration and redeploying:

1. **Check Build Completes:**
   - Deployment status should be "Success"
   - No timeout errors

2. **Check Service Starts:**
   - Logs should show: `🚀 Mandate Service running on port [PORT]`

3. **Test Health Endpoint:**
   ```bash
   curl https://pure-wonder-production.up.railway.app/health
   ```
   Should return:
   ```json
   {"status":"ok","service":"mandate-service"}
   ```

## Common Errors and Fixes

### Error: Build Timed Out
**Cause:** Server starting during build phase
**Fix:** Configure Build Command to not start server

### Error: Service Crashed on Startup
**Cause:** Missing `DATABASE_URL` or database connection failed
**Fix:** Set `DATABASE_URL` in Railway Variables

### Error: Cannot GET /health
**Cause:** Service not running (build didn't complete or service crashed)
**Fix:** Check logs, fix build configuration, redeploy

## Summary

The "Cannot GET /health" error means the service isn't running. Most likely causes:

1. **Build timed out** - Railway was starting server during build
2. **Service crashed** - Missing env vars or database connection issue
3. **Service never started** - Build didn't complete

**Action Required:**
1. Check Railway Dashboard → Service "pure-wonder" → Logs
2. Check deployment status (failed/timed out?)
3. Configure build/start commands in Railway Dashboard
4. Redeploy service

The `postinstall` script already builds TypeScript - Railway just needs to not start the server during build phase.
