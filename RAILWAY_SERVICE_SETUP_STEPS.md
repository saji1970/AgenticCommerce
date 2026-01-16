# Railway Service Setup for Mandate Service

## Service: pure-wonder (ID: 025ad39c-870a-486a-901d-db9a2d6671d9)

## Critical Configuration Steps

### Step 1: Set Root Directory (MOST IMPORTANT)

1. Go to Railway Dashboard
2. Open service **"pure-wonder"**
3. Click **Settings** tab
4. Scroll to **"Root Directory"**
5. Set it to: `apps/mandate-service`
6. **Save** the settings

⚠️ **This is the most important step!** Without this, Railway will try to build from the root directory.

### Step 2: Verify Source Connection

1. In **Settings** → **Source**
2. Ensure GitHub repository is connected
3. Branch should be: `master` (or your main branch)
4. If not connected, click **"Connect GitHub Repo"**

### Step 3: Set Environment Variables

Go to **Variables** tab and add:

```
DATABASE_URL=<your-database-url>
MANDATE_SERVICE_PORT=3001
NODE_ENV=production
JWT_SECRET=<your-jwt-secret>
CORS_ORIGIN=*
```

### Step 4: Manual Build Configuration (If Auto-Detection Fails)

If Railway doesn't auto-detect the build config:

1. Go to **Settings** → **Build & Deploy**
2. **Build Command** (if needed):
   ```bash
   npm install -g pnpm corepack && corepack enable && cd ../.. && pnpm install --frozen-lockfile && pnpm build:shared && pnpm run build
   ```
3. **Start Command** (if needed):
   ```bash
   node dist/server.js
   ```

### Step 5: Trigger Deployment

1. Go to **Deployments** tab
2. Click **"Deploy"** button
3. Or push a new commit to trigger auto-deploy

### Step 6: Verify Deployment

Once deployed, check:

1. **Logs** tab - Should show:
   ```
   🚀 Mandate Service running on port 3001
   📡 Environment: production
   🔗 Health check: http://localhost:3001/health
   ```

2. **Public URL** - Railway will generate a domain
   - Go to **Settings** → **Generate Domain**
   - Test: `curl https://your-domain.up.railway.app/health`
   - Should return: `{"status":"ok","service":"mandate-service"}`

## Troubleshooting

### Issue: Service shows "No deployments"

**Solution:**
1. Check Root Directory is set to `apps/mandate-service`
2. Verify GitHub connection
3. Manually trigger deployment
4. Check Railway logs for errors

### Issue: Build fails

**Solution:**
1. Check logs for specific error
2. Verify `pnpm-lock.yaml` is up to date
3. Ensure `DATABASE_URL` is set
4. Check build command in settings

### Issue: Service starts but crashes

**Solution:**
1. Check logs for runtime errors
2. Verify `DATABASE_URL` is correct
3. Check port configuration (Railway auto-assigns port)
4. Verify environment variables are set

### Issue: Wrong service is being built

**Solution:**
1. **CRITICAL**: Set Root Directory to `apps/mandate-service`
2. Clear build cache
3. Redeploy

## Quick Checklist

- [ ] Root Directory set to `apps/mandate-service`
- [ ] GitHub repository connected
- [ ] Environment variables set (especially `DATABASE_URL`)
- [ ] Build command detected or manually set
- [ ] Start command detected or manually set
- [ ] Deployment triggered
- [ ] Service is running (check logs)
- [ ] Health endpoint responds correctly

## Using Railway CLI (Alternative)

If dashboard configuration is problematic:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to service
cd apps/mandate-service
railway link --service 025ad39c-870a-486a-901d-db9a2d6671d9

# Set variables
railway variables set DATABASE_URL=<your-db-url>
railway variables set MANDATE_SERVICE_PORT=3001
railway variables set NODE_ENV=production

# Deploy
railway up
```

## Expected Behavior

Once correctly configured:

1. **Build Phase:**
   - Installs pnpm
   - Installs dependencies from root
   - Builds shared packages
   - Builds mandate service

2. **Deploy Phase:**
   - Starts Node.js server
   - Listens on Railway-assigned port
   - Health endpoint available at `/health`

3. **Logs Show:**
   ```
   🚀 Mandate Service running on port 3001
   📡 Environment: production
   ```

## Still Not Working?

1. **Check Railway Status**: https://status.railway.app
2. **Review Logs**: Service → Logs tab
3. **Contact Support**: support@railway.app
4. **Try Fresh Service**: Create new service and configure from scratch
