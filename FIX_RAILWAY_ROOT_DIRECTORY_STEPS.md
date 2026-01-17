# Step-by-Step: Fix Railway Root Directory Setting

## Problem
```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND  In : "@agentic-commerce/shared-types@workspace:*" 
is in the dependencies but no package named "@agentic-commerce/shared-types" 
is present in the workspace
Packages found in the workspace: 
```

**Root Cause:** Root Directory is set to `apps/mandate-service`, so only that directory is copied. Workspace packages are missing.

## Solution: Remove Root Directory Setting

### Exact Steps (with screenshots locations):

1. **Open Railway Dashboard**
   - Go to https://railway.app/dashboard
   - Login if needed

2. **Select Your Project**
   - Click on your project that contains the "pure-wonder" service

3. **Open Service "pure-wonder"**
   - Find service named "pure-wonder" (ID: `025ad39c-870a-486a-901d-db9a2d6671d9`)
   - Click on it to open

4. **Go to Settings Tab**
   - Look for tabs: Deployments, Metrics, Logs, Settings, Variables, etc.
   - Click on **"Settings"** tab

5. **Find Root Directory Field**
   - Scroll down in Settings
   - Look for field labeled **"Root Directory"** or **"Root Dir"**
   - It might be under "Build & Deploy" section
   - Current value: `apps/mandate-service`

6. **Clear the Root Directory**
   - Click in the Root Directory field
   - **DELETE ALL TEXT** (make it empty/blank)
   - Or click the X/clear button if available
   - Field should be completely empty

7. **Save Settings**
   - Click **"Save"** or **"Update"** button
   - Wait for confirmation

8. **Trigger New Deployment**
   - Go to **"Deployments"** tab
   - Click **"Deploy"** or **"Redeploy"** button
   - Or push a new commit to trigger auto-deploy

## Verification

After removing root directory and deploying:

1. **Check Build Logs**
   - Should see entire repository being copied
   - Should see workspace packages in `packages/` directory
   - Should see `pnpm-lock.yaml` at root

2. **Build Should Succeed**
   - No `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` error
   - All workspace packages found
   - TypeScript builds successfully

3. **Service Should Start**
   - Logs show: `🚀 Mandate Service running on port 3001`
   - Health endpoint responds: `/health`

## Alternative: Railway CLI

If Dashboard is not accessible, use Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to service
cd apps/mandate-service
railway link --service 025ad39c-870a-486a-901d-db9a2d6671d9

# Check current settings
railway status

# Update root directory (set to empty)
# Note: Railway CLI might not have direct root directory setting
# You may need to use Dashboard for this
```

## What Happens After Fix

**Before (Root Directory = `apps/mandate-service`):**
```
/app/                    # Railway working directory
  apps/
    mandate-service/     # Only this is copied
      src/
      package.json
```

**After (Root Directory = BLANK):**
```
/app/                    # Railway working directory
  apps/
    mandate-service/     # Service directory
      src/
      package.json
  packages/              # ✅ Workspace packages now available
    shared-types/
    validation/
  package.json           # ✅ Root package.json available
  pnpm-lock.yaml         # ✅ Lockfile available
  pnpm-workspace.yaml    # ✅ Workspace config available
```

## Why This Is Required

For pnpm monorepos with workspaces:
- All workspace packages must be accessible
- Root `package.json` and `pnpm-lock.yaml` must exist
- pnpm needs to see the full workspace structure

Setting Root Directory excludes parent directories, breaking workspace resolution.

## Summary

**ACTION: Remove Root Directory setting in Railway Dashboard**

The code is already configured correctly. You just need to update Railway settings to stop excluding the workspace packages.
