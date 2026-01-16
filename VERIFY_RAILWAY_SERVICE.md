# Verify Railway Service Configuration

## Service: pure-wonder (ID: 025ad39c-870a-486a-901d-db9a2d6671d9)

## Step-by-Step Verification

### 1. Check Service Settings

In Railway Dashboard:
1. Go to your project
2. Find service **"pure-wonder"**
3. Click on it → Go to **Settings** tab

**Verify these settings:**

#### Root Directory
- Should be: `apps/mandate-service`
- If blank or different, set it to: `apps/mandate-service`

#### Source
- Should be connected to your GitHub repository
- Branch should be: `master` (or your main branch)

### 2. Check Build Configuration

Railway should detect:
- **Build Command**: From `apps/mandate-service/nixpacks.toml`
- **Start Command**: From `apps/mandate-service/railway.json`

If not detected, manually set:
- **Build Command**: 
  ```bash
  npm install -g pnpm && cd ../.. && pnpm install --frozen-lockfile && pnpm build:shared && cd apps/mandate-service && pnpm run build
  ```
- **Start Command**: 
  ```bash
  cd apps/mandate-service && node dist/server.js
  ```

### 3. Check Environment Variables

Ensure these are set:
```
DATABASE_URL=<your-database-url>
MANDATE_SERVICE_PORT=3001
NODE_ENV=production
JWT_SECRET=<your-secret>
CORS_ORIGIN=*
```

### 4. Check Deployments

1. Go to service → **Deployments** tab
2. Check if there are any deployments
3. If no deployments, trigger one:
   - Click **"Deploy"** button
   - Or push a new commit to trigger auto-deploy

### 5. Check Logs

1. Go to service → **Logs** tab
2. Look for:
   - Build errors
   - Start command errors
   - Port binding issues

### 6. Verify Service is Running

Once deployed, check:
- **Health endpoint**: `https://pure-wonder-production.up.railway.app/health`
- Should return: `{"status":"ok","service":"mandate-service"}`

## Common Issues

### Issue 1: Root Directory Not Set
**Symptom**: Service builds but uses wrong directory
**Fix**: Set Root Directory to `apps/mandate-service` in Settings

### Issue 2: Wrong Build Configuration
**Symptom**: Build fails or builds wrong service
**Fix**: Ensure `apps/mandate-service/nixpacks.toml` is being used

### Issue 3: No Deployments
**Symptom**: Service exists but no deployments
**Fix**: 
- Check GitHub connection
- Manually trigger deployment
- Or use Railway CLI: `railway up`

### Issue 4: Service Not Starting
**Symptom**: Build succeeds but service doesn't start
**Fix**: 
- Check logs for errors
- Verify `DATABASE_URL` is set
- Check start command in `railway.json`

## Manual Configuration (If Auto-Detection Fails)

If Railway isn't auto-detecting the configuration:

1. **Go to Settings** → **Build & Deploy**
2. **Set Build Command**:
   ```bash
   npm install -g pnpm && corepack enable && cd ../.. && pnpm install --frozen-lockfile && pnpm build:shared && cd apps/mandate-service && pnpm run build
   ```
3. **Set Start Command**:
   ```bash
   cd apps/mandate-service && node dist/server.js
   ```
4. **Set Root Directory**: `apps/mandate-service`

## Quick Fix: Recreate Service

If nothing works:

1. **Note down the service ID**: `025ad39c-870a-486a-901d-db9a2d6671d9`
2. **Create new service** in Railway
3. **Set Root Directory**: `apps/mandate-service`
4. **Connect to same GitHub repo**
5. **Set environment variables**
6. **Deploy**

## Verify via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to service
cd apps/mandate-service
railway link --service 025ad39c-870a-486a-901d-db9a2d6671d9

# Check service status
railway status

# View logs
railway logs

# Deploy
railway up
```
