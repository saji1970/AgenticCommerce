# Fix Railway Build Phase - Manual Configuration Required

## Problem

Railway Railpack is running `cd apps/mandate-service && npm run start` during the **build phase**, causing the build to hang.

**Build should:** Compile TypeScript (already done by `postinstall`)
**Railway is doing:** Starting server during build ❌

## Solution: Configure Railway Dashboard Settings

Since Railway is using Railpack instead of Nixpacks, we need to configure build commands in Railway Dashboard.

### Step 1: Open Railway Settings

1. Railway Dashboard → Service "pure-wonder" → **Settings**
2. Look for section: **"Build & Deploy"** or **"Build Configuration"**

### Step 2: Set Build Command

**Build Command** (what runs during build phase):
```bash
echo "Build completed by postinstall script"
```

Or leave it blank - the `postinstall` script already builds everything.

### Step 3: Set Start Command

**Start Command** (what runs during deploy/start phase):
```bash
cd apps/mandate-service && node dist/server.js
```

Or use the Procfile which already has:
```
web: node dist/server.js
```

### Step 4: Save and Redeploy

1. Click **Save** in Railway Dashboard
2. Go to **Deployments** tab
3. Click **Redeploy**

## Why This Happens

**Current behavior:**
- `postinstall` runs after `pnpm install` → Builds TypeScript ✅
- Railway Railpack also tries to run `npm run start` during build ❌
- Server starts during build → Hangs/timeouts

**Expected behavior:**
- `postinstall` runs after `pnpm install` → Builds TypeScript ✅
- Build phase completes (no server start)
- Deploy phase → Server starts from Procfile/Start Command ✅

## Alternative: Force Nixpacks

The `railway.json` specifies NIXPACKS, but Railway is using Railpack. You can:

1. **Set Builder in Railway Dashboard:**
   - Settings → Build & Deploy
   - Change Builder from "Railpack" to "Nixpacks"
   - Use the `nixpacks.toml` configuration

2. **Or use Railpack with explicit commands:**
   - Set Build Command to empty (build is done by postinstall)
   - Set Start Command to: `cd apps/mandate-service && node dist/server.js`

## Current Configuration Files

**railway.json:**
```json
{
  "build": {
    "builder": "NIXPACKS",
    "nixpacksConfigPath": "nixpacks.toml"
  },
  "deploy": {
    "startCommand": "cd apps/mandate-service && node dist/server.js"
  }
}
```

**nixpacks.toml:**
```toml
[phases.build]
cmds = [
  "pnpm build:shared",
  "cd apps/mandate-service && pnpm run build"
]

[start]
cmd = "cd apps/mandate-service && node dist/server.js"
```

**Procfile (in apps/mandate-service/):**
```
web: node dist/server.js
```

## Verification

After configuring, build logs should show:
1. ✅ Install dependencies
2. ✅ `postinstall` runs → Builds TypeScript
3. ✅ Build phase completes (no server start)
4. ✅ Deploy phase → Server starts

## Summary

**Action Required in Railway Dashboard:**
1. Settings → Build & Deploy
2. Set Build Command (or leave blank - postinstall handles it)
3. Set Start Command: `cd apps/mandate-service && node dist/server.js`
4. Save and Redeploy

The `postinstall` script already builds everything - Railway just needs to know not to start the server during build.
