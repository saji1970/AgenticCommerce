# ⚠️ CRITICAL: Railway Dashboard Settings Fix Required

## Current Status
**Build is FAILING** because Root Directory is set in Railway Dashboard.

## Error Message
```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND
In : "@agentic-commerce/shared-types@workspace:*" is in the dependencies 
but no package named "@agentic-commerce/shared-types" is present in the workspace
Packages found in the workspace: [EMPTY]
```

## Root Cause
**Root Directory setting in Railway Dashboard** is set to `apps/mandate-service`.

When this is set:
- Railway only copies `apps/mandate-service/` directory
- `packages/shared-types/` is NOT copied ❌
- `packages/validation/` is NOT copied ❌
- Root `pnpm-lock.yaml` is NOT copied ❌
- pnpm cannot find workspace packages → Build fails

## Solution: Remove Root Directory in Railway Dashboard

### Step-by-Step Instructions

1. **Go to Railway Dashboard**
   - URL: https://railway.app/dashboard
   - Login if needed

2. **Navigate to Service**
   - Click on your project
   - Find and click on service: **"pure-wonder"**
   - Service ID: `025ad39c-870a-486a-901d-db9a2d6671d9`

3. **Open Settings Tab**
   - Click **"Settings"** in the service menu
   - (Not "Variables" - that's different)

4. **Find Root Directory Field**
   - Scroll down in Settings
   - Look for field labeled **"Root Directory"** or **"Root Dir"**
   - It might be under section: "Build & Deploy"
   - **Current value**: `apps/mandate-service`

5. **Clear Root Directory**
   - Click in the Root Directory input field
   - **Select all text** (Ctrl+A or Cmd+A)
   - **Delete it** (Backspace or Delete key)
   - Field should be **completely empty/blank**
   - No spaces, no text, just empty

6. **Save Settings**
   - Click **"Save"** or **"Update"** button
   - Wait for confirmation message

7. **Trigger New Deployment**
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** button (or push a new commit)
   - Watch the build logs

## What to Expect After Fix

### Before (Root Directory = `apps/mandate-service`)
```
/app/                     # Railway copies ONLY this
  apps/
    mandate-service/     # Only this directory
      src/
      package.json
```

### After (Root Directory = BLANK)
```
/app/                     # Railway copies ENTIRE repo
  apps/
    mandate-service/     # Service directory ✅
      src/
      package.json
  packages/              # Workspace packages ✅
    shared-types/        # Now available!
    validation/          # Now available!
  package.json           # Root package.json ✅
  pnpm-lock.yaml         # Lockfile ✅
  pnpm-workspace.yaml    # Workspace config ✅
```

## Verification After Fix

1. **Check Build Logs**
   - Should see: `Packages found in the workspace: @agentic-commerce/shared-types, @agentic-commerce/validation`
   - No `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` error

2. **Build Should Succeed**
   - TypeScript compiles successfully
   - All workspace packages found
   - Service builds and starts

3. **Service Should Run**
   - Logs show: `🚀 Mandate Service running on port 3001`
   - Health endpoint works: `GET /health`

## Why Code Changes Won't Fix This

**The code is already correct:**
- ✅ `nixpacks.toml` is configured correctly
- ✅ `package.json` scripts are correct
- ✅ `railway.json` doesn't set root directory
- ✅ All TypeScript code compiles

**The problem is Railway Dashboard settings:**
- ❌ Root Directory setting excludes workspace packages
- ❌ This can ONLY be fixed in Railway Dashboard
- ❌ Code changes cannot override this setting

## Alternative: Verify Root Directory Setting

If you're not sure where to find it:

1. **Railway Dashboard** → **Service "pure-wonder"** → **Settings**
2. Look for any field that says "Root" or "Directory"
3. It might also be in "Build & Deploy" section
4. Some Railway UI versions call it "Source Directory" or "Build Path"

## If You Cannot Find Root Directory Setting

1. Check Railway documentation: https://docs.railway.app/develop/root-directory
2. Try Railway CLI:
   ```bash
   railway link --service 025ad39c-870a-486a-901d-db9a2d6671d9
   railway status
   ```
3. Contact Railway support if setting is not visible

## Summary

**THIS IS A RAILWAY DASHBOARD SETTING ISSUE**

- ✅ Code is correct
- ✅ Configuration is correct  
- ❌ Root Directory setting in Railway Dashboard must be removed
- ❌ This is the ONLY fix required

**ACTION:** Remove Root Directory setting → Save → Redeploy

Once removed, the build will succeed immediately.
