# Railway Root Directory Configuration - CRITICAL

## Problem
Railway is detecting the root `Procfile` and using it instead of `nixpacks.toml` for the mandate service build.

## Solution: Set Root Directory in Railway Dashboard

### Step-by-Step Instructions

1. **Go to Railway Dashboard**
   - Navigate to your project
   - Open service **"pure-wonder"** (ID: `025ad39c-870a-486a-901d-db9a2d6671d9`)

2. **Open Settings Tab**
   - Click on **Settings** in the service menu

3. **Set Root Directory**
   - Scroll to **"Root Directory"** field
   - **CRITICAL**: Set it to: `apps/mandate-service`
   - Click **Save**

4. **Verify Build Configuration**
   - After setting root directory, Railway should:
     - Use `apps/mandate-service/nixpacks.toml` for build
     - Ignore root `Procfile`
     - Build from `apps/mandate-service` directory

## Why This Is Needed

When root directory is NOT set:
- Railway builds from repository root
- Detects root `Procfile` (`web: cd apps/backend && npm run start`)
- Uses Procfile instead of `nixpacks.toml`
- Tries to start service without building TypeScript
- **Result**: `Error: Cannot find module '/app/apps/mandate-service/dist/server.js'`

When root directory IS set to `apps/mandate-service`:
- Railway builds from `apps/mandate-service` directory
- Uses `apps/mandate-service/nixpacks.toml` for build
- Ignores root `Procfile`
- Builds TypeScript before starting
- **Result**: Service starts successfully

## Expected Build Flow (After Root Directory is Set)

1. **Install Phase:**
   ```
   - Install pnpm
   - Go to repo root: cd ../..
   - Install dependencies: pnpm install --frozen-lockfile
   ```

2. **Build Phase:**
   ```
   - Go to repo root: cd ../..
   - Build shared packages: pnpm build:shared
   - Go to service: cd apps/mandate-service
   - Build TypeScript: pnpm run build
   - Creates: apps/mandate-service/dist/
   ```

3. **Start Phase:**
   ```
   - Go to service: cd apps/mandate-service
   - Start server: node dist/server.js
   ```

## Verification

After setting root directory and deploying:

1. **Check Logs** - Should show:
   ```
   🚀 Mandate Service running on port 3001
   📡 Environment: production
   🔗 Health check: http://localhost:3001/health
   ```

2. **Test Health Endpoint:**
   ```bash
   curl https://pure-wonder-production.up.railway.app/health
   ```
   Should return: `{"status":"ok","service":"mandate-service"}`

## Alternative: Railway CLI

If dashboard configuration doesn't work:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to service
cd apps/mandate-service
railway link --service 025ad39c-870a-486a-901d-db9a2d6671d9

# Set root directory (if CLI supports it)
# Or use dashboard to set it

# Deploy
railway up
```

## Troubleshooting

### Issue: Still using root Procfile
- **Check**: Root Directory is set to `apps/mandate-service`
- **Check**: Service is using NIXPACKS builder (not Procfile)
- **Fix**: Clear build cache and redeploy

### Issue: Build fails with path errors
- **Check**: Root Directory is correctly set
- **Check**: `nixpacks.toml` paths are correct
- **Fix**: Verify paths in `nixpacks.toml` assume root is `apps/mandate-service`

### Issue: Service starts but crashes
- **Check**: `DATABASE_URL` environment variable is set
- **Check**: Port configuration (Railway auto-assigns port)
- **Check**: Logs for specific error messages

## Summary

**MOST IMPORTANT STEP**: Set Root Directory to `apps/mandate-service` in Railway Dashboard Settings.

Without this, Railway will always use the root `Procfile` and the build will fail.
