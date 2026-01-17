# Build Failure Summary - Mandate Service

## Current Status
**Deployment failed during build process**

## Root Cause
**Root Directory setting in Railway Dashboard** is still set to `apps/mandate-service`.

This causes:
- Workspace packages (`packages/shared-types`, `packages/validation`) are not copied
- Build fails with: `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`

## Required Fix

### Step 1: Remove Root Directory Setting

1. **Open Railway Dashboard**
   - URL: https://railway.app/dashboard
   - Login if needed

2. **Navigate to Service**
   - Select your project
   - Click on service: **"pure-wonder"** (ID: `025ad39c-870a-486a-901d-db9a2d6671d9`)

3. **Open Settings**
   - Click **"Settings"** tab

4. **Find Root Directory Field**
   - Scroll down in Settings
   - Look under "Build & Deploy" or "Source" section
   - Find field: **"Root Directory"** or **"Root Dir"**

5. **Clear Root Directory**
   - Click in the field
   - **Delete all text** (make it completely empty/blank)
   - **Save** the settings

6. **Redeploy**
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** button
   - Or push a new commit to trigger auto-deploy

### Step 2: Verify Fix

After removing root directory and redeploying:

**✅ Success Indicators:**
- Build logs show: `Packages found in the workspace: @agentic-commerce/shared-types, @agentic-commerce/validation`
- No `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` error
- TypeScript compiles successfully
- Service starts: `🚀 Mandate Service running on port 3001`

**❌ Still Failing If:**
- Build logs show: `Packages found in the workspace: [EMPTY]`
- Error: `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`
- This means root directory is still set

## Current Configuration

The `nixpacks.toml` is correctly configured:

```toml
[phases.setup]
nixPkgs = ["nodejs"]

[phases.install]
cmds = [
  "npm install -g pnpm corepack",
  "corepack enable",
  "pnpm install --no-frozen-lockfile"
]

[phases.build]
cmds = [
  "pnpm build:shared",
  "cd apps/mandate-service && pnpm run build"
]

[start]
cmd = "cd apps/mandate-service && node dist/server.js"
```

## Why Code Changes Won't Fix This

**The code is already correct:**
- ✅ `nixpacks.toml` properly configured
- ✅ `package.json` scripts correct
- ✅ `railway.json` doesn't set root directory
- ✅ TypeScript code compiles locally

**The problem is Railway settings:**
- ❌ Root Directory setting excludes workspace packages
- ❌ This can ONLY be changed in Railway Dashboard
- ❌ Code changes cannot override this

## If You Can't Find Root Directory Setting

1. **Check All Settings Sections**
   - "Build & Deploy"
   - "Source"
   - "General"

2. **Contact Railway Support**
   - Email: support@railway.app
   - Ask: "How do I remove the Root Directory setting for service 025ad39c-870a-486a-901d-db9a2d6671d9?"

3. **Check Railway Documentation**
   - https://docs.railway.app/develop/root-directory

## Alternative: Verify Service Configuration

You can also check the service configuration via Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to service
railway link --service 025ad39c-870a-486a-901d-db9a2d6671d9

# Check status (will show root directory if set)
railway status
```

## Summary

**This is a Railway Dashboard settings issue, NOT a code issue.**

**Action Required:**
1. Remove Root Directory setting in Railway Dashboard
2. Save settings
3. Redeploy service
4. Build will succeed

**The code is ready - you just need to update Railway settings.**
