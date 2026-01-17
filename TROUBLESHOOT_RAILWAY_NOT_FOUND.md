# Troubleshoot Railway "Not Found" Error

## Error Message
```
Not Found
The train has not arrived at the station.

Please check your network settings to confirm that your domain has provisioned.
```

## Possible Causes

### 1. Service Not Running
The service might have crashed or failed to start after deployment.

### 2. Domain Not Provisioned
The public domain might not be properly configured or provisioned.

### 3. Service Crashed After Start
The service might have started but crashed due to missing environment variables or database connection issues.

### 4. Wrong Domain/Service
You might be accessing the wrong service domain.

## Step-by-Step Troubleshooting

### Step 1: Check Service Status

1. **Go to Railway Dashboard**
   - https://railway.app/dashboard
   - Navigate to service: **"pure-wonder"**

2. **Check Deployment Status**
   - Go to **"Deployments"** tab
   - Check the latest deployment:
     - ✅ **Success** = Deployment succeeded
     - ❌ **Failed** = Deployment failed (check logs)

3. **Check Service Logs**
   - Go to **"Logs"** tab
   - Look for:
     - `🚀 Mandate Service running on port 3001` ✅
     - `Error:` or `Failed to connect` ❌

### Step 2: Verify Environment Variables

1. **Go to Variables Tab**
   - Service "pure-wonder" → **"Variables"**

2. **Check Required Variables**
   - `DATABASE_URL` - Should be set (required)
   - `MANDATE_SERVICE_PORT` - Optional (defaults to 3001)
   - `NODE_ENV` - Optional (defaults to development)

3. **If DATABASE_URL is Missing**
   - Service will crash on startup
   - Add `DATABASE_URL` in Variables tab
   - Redeploy service

### Step 3: Check Domain Configuration

1. **Go to Settings Tab**
   - Service "pure-wonder" → **"Settings"**

2. **Check Public Domain**
   - Look for section: **"Networking"** or **"Domain"**
   - Ensure public domain is generated/provisioned
   - Should see: `pure-wonder-production.up.railway.app`

3. **Generate Domain (if missing)**
   - Click **"Generate Domain"** button
   - Wait for domain to provision (may take a few minutes)

### Step 4: Check Service Logs for Errors

In the **"Logs"** tab, look for:

**✅ Good Signs:**
```
🚀 Mandate Service running on port 3001
📡 Environment: production
🔗 Health check: http://localhost:3001/health
```

**❌ Error Signs:**
```
Error: Cannot connect to database
Error: Environment variable DATABASE_URL is required
Error: listen EADDRINUSE: address already in use :::3001
Failed to start server
```

### Step 5: Verify Database Connection

If `DATABASE_URL` is set but service is failing:

1. **Check DATABASE_URL Format**
   ```
   postgresql://user:password@host:port/database
   ```

2. **Test Database Connection**
   - Use a PostgreSQL client
   - Verify connection string works
   - Check if database is accessible

3. **Run Migrations** (if needed)
   - Service might need database tables
   - Run migration script if tables don't exist

## Common Issues and Fixes

### Issue 1: DATABASE_URL Missing

**Error in logs:**
```
Error: Cannot connect to database
```

**Fix:**
1. Railway Dashboard → Service "pure-wonder" → Variables
2. Add `DATABASE_URL` variable
3. Value: Your PostgreSQL connection string
4. Redeploy service

### Issue 2: Service Crashed on Startup

**Error in logs:**
```
Error: listen EADDRINUSE: address already in use
```

**Fix:**
1. Use Railway-assigned `PORT` environment variable
2. Update service to use `process.env.PORT` instead of fixed port
3. Or remove conflicting port configuration

### Issue 3: Domain Not Provisioned

**Error:**
```
The train has not arrived at the station
```

**Fix:**
1. Railway Dashboard → Service "pure-wonder" → Settings
2. Generate public domain
3. Wait for provisioning (2-5 minutes)
4. Try accessing again

### Issue 4: Wrong Service Domain

**Error:**
Accessing wrong URL

**Fix:**
1. Verify you're using the correct domain
2. Check Railway Dashboard for exact domain name
3. Format: `https://pure-wonder-production.up.railway.app`

## Quick Fix: Update Server to Use Railway PORT

Railway automatically assigns a `PORT` environment variable. Update the service to use it:

**Current:**
```typescript
const PORT = config.port; // Uses MANDATE_SERVICE_PORT or defaults to 3001
```

**Recommended:**
```typescript
const PORT = process.env.PORT || config.port; // Use Railway PORT if available
```

## Verification Steps

1. ✅ **Deployment Status:** Check "Deployments" tab - should be "Success"
2. ✅ **Service Logs:** Should show service running message
3. ✅ **Environment Variables:** `DATABASE_URL` must be set
4. ✅ **Public Domain:** Should be provisioned in Settings
5. ✅ **Health Endpoint:** Should respond at `/health`

## Next Steps

1. Check service logs in Railway Dashboard
2. Verify `DATABASE_URL` is set in Variables
3. Ensure public domain is provisioned
4. Try accessing health endpoint: `/health`
5. If still failing, check logs for specific error messages

## Summary

The "Not Found" error usually means:
- Service crashed after deployment
- Missing `DATABASE_URL` environment variable
- Public domain not provisioned
- Service not listening on correct port

**Check Logs first** - they will show the exact error.
