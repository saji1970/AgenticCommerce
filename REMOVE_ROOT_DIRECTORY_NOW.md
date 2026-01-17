# ⚠️ URGENT: Remove Root Directory Setting NOW

## The Error You're Seeing
```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND
Packages found in the workspace: [EMPTY]
```

**This means:** Root Directory is still set to `apps/mandate-service` in Railway Dashboard.

## Quick Fix (30 seconds)

### Option 1: Railway Dashboard Web UI

1. **Open Railway Dashboard**
   - Go to: https://railway.app/dashboard
   - Sign in if needed

2. **Select Service**
   - Click your project
   - Click service: **"pure-wonder"**

3. **Open Settings**
   - Click tab: **"Settings"** (at the top of the service page)

4. **Find Root Directory Field**
   - Scroll down in Settings
   - Look for section: **"Build & Deploy"** or **"Source"**
   - Find field labeled: **"Root Directory"** or **"Root Dir"** or **"Source Directory"**

5. **Clear It**
   - Click in the field
   - Delete ALL text (make it completely empty)
   - Click **"Save"** or **"Update"**

6. **Redeploy**
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** or push a new commit

### Option 2: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your service
railway link --service 025ad39c-870a-486a-901d-db9a2d6671d9

# Check current settings (will show root directory if set)
railway status

# Note: Railway CLI might not directly allow changing root directory
# You may need to use Dashboard for this
```

## How to Verify Root Directory is Removed

### Check 1: Build Logs
After removing root directory and deploying, build logs should show:
```
Packages found in the workspace: @agentic-commerce/shared-types, @agentic-commerce/validation
```

**NOT:**
```
Packages found in the workspace: [EMPTY]
```

### Check 2: File Structure in Build
Look for these in build logs:
- ✅ `packages/shared-types/` should exist
- ✅ `packages/validation/` should exist  
- ✅ Root `package.json` should exist
- ✅ `pnpm-lock.yaml` should exist

## What Root Directory Does

**When Root Directory = `apps/mandate-service`:**
- Railway copies ONLY `apps/mandate-service/` folder
- Parent directories are excluded
- Result: Workspace packages missing → Build fails

**When Root Directory = BLANK (empty):**
- Railway copies ENTIRE repository
- All workspace packages included
- Result: Workspace packages found → Build succeeds

## Current Status

**Your code is 100% correct.** The ONLY issue is the Railway Dashboard setting.

## If You Can't Find Root Directory Setting

1. **Check All Settings Sections**
   - Look in: "Settings" → "Build & Deploy"
   - Look in: "Settings" → "Source"
   - Look in: "Settings" → "General"

2. **Try Railway Support**
   - Email: support@railway.app
   - Or: https://railway.app/help
   - Ask: "How do I remove or clear the Root Directory setting for my service?"

3. **Check Railway Documentation**
   - https://docs.railway.app/develop/root-directory
   - Shows how to set/remove root directory

## Summary

**THIS IS NOT A CODE PROBLEM**  
**THIS IS A RAILWAY DASHBOARD SETTINGS PROBLEM**

**ACTION REQUIRED:**
1. Open Railway Dashboard
2. Service "pure-wonder" → Settings
3. Find "Root Directory" field
4. Clear it (make empty)
5. Save
6. Redeploy

**That's it. Once removed, build will succeed.**
