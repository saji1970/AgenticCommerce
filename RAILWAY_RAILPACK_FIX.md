# Railway Railpack Build Fix - Mandate Service

## Problem
Railway is using **Railpack** (not Nixpacks) and detecting the root `Procfile`, which causes it to skip the TypeScript build step.

## Root Cause
- Railway Railpack auto-detects `Procfile` at repository root
- It uses `Procfile` instead of `nixpacks.toml` build configuration
- The build step tries to start the service without compiling TypeScript first

## Solution Applied

### 1. Added Procfile to mandate-service
Created `apps/mandate-service/Procfile` with:
```
web: node dist/server.js
```

This will be used when Root Directory is set to `apps/mandate-service`.

### 2. Updated postinstall script
Modified `apps/mandate-service/package.json` to build TypeScript during `postinstall`:
```json
"postinstall": "cd ../.. && pnpm build:shared && cd apps/mandate-service && pnpm run build"
```

This ensures TypeScript is compiled after dependencies are installed, before Railway tries to start the service.

### 3. Updated nixpacks.toml
Simplified start command to work from service directory:
```
[start]
cmd = "node dist/server.js"
```

## Critical: Set Root Directory

**YOU MUST DO THIS IN RAILWAY DASHBOARD:**

1. Go to Railway Dashboard
2. Open service **"pure-wonder"**
3. Click **Settings**
4. Find **"Root Directory"**
5. Set to: `apps/mandate-service`
6. **Save**

## How It Works Now

### When Root Directory is Set to `apps/mandate-service`:

1. **Railway detects** `apps/mandate-service/Procfile`
2. **Install phase:**
   - Installs dependencies
   - Runs `postinstall` script which:
     - Builds shared packages
     - Builds mandate service TypeScript
3. **Start phase:**
   - Uses `Procfile`: `web: node dist/server.js`
   - Service starts from compiled `dist/` directory

## Build Flow

```
1. Install dependencies
   └─> pnpm install
       └─> postinstall hook runs
           ├─> Build shared packages
           └─> Build mandate service (tsc)
               └─> Creates dist/server.js

2. Start service
   └─> Procfile: web: node dist/server.js
       └─> Service runs from dist/
```

## Verification

After setting root directory and deploying:

1. **Check Logs** - Should show:
   ```
   🚀 Mandate Service running on port 3001
   📡 Environment: production
   ```

2. **Test Health:**
   ```bash
   curl https://pure-wonder-production.up.railway.app/health
   ```
   Should return: `{"status":"ok","service":"mandate-service"}`

## Why This Works

- **postinstall** runs automatically after `pnpm install`
- Railway Railpack respects `postinstall` hooks
- TypeScript is compiled before service starts
- `Procfile` in service directory is used when root directory is set
- Service starts from compiled code in `dist/`

## Alternative: Manual Build Command

If `postinstall` doesn't work, you can set a custom build command in Railway:

**Settings → Build & Deploy → Build Command:**
```bash
cd ../.. && pnpm install --frozen-lockfile && pnpm build:shared && cd apps/mandate-service && pnpm run build
```

**Start Command:**
```bash
node dist/server.js
```

## Summary

1. ✅ Added `Procfile` to mandate-service
2. ✅ Updated `postinstall` to build TypeScript
3. ✅ **YOU MUST SET ROOT DIRECTORY** to `apps/mandate-service` in Railway Dashboard

Without setting the root directory, Railway will continue using the root `Procfile` and the build will fail.
