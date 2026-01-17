# Fix Railway Railpack Build Phase Issue

## Problem

Railway Railpack is running `cd apps/mandate-service && npm run start` during the **build phase** instead of building TypeScript.

**Current behavior:**
- Build phase: Starts server (`npm run start`) ❌
- Server runs indefinitely during build → Build hangs/timeouts
- Should: Build TypeScript (`pnpm run build`) ✅

## Root Cause

Railway Railpack is auto-detecting configuration incorrectly:
- It's using the root `Procfile` or detecting wrong build commands
- The build phase is starting the server instead of compiling

## Solution

The `postinstall` script already builds TypeScript:
```json
"postinstall": "cd ../.. && pnpm build:shared && cd apps/mandate-service && pnpm run build"
```

This runs automatically after `pnpm install`, so TypeScript is already compiled.

**The issue:** Railway Railpack might be trying to run additional build steps that start the server.

## Fix Options

### Option 1: Let postinstall Handle Build (Recommended)

The `postinstall` script already builds everything. Railway should:
1. Install dependencies → `postinstall` runs → TypeScript compiled
2. Deploy phase → Start server from `Procfile`

**No code changes needed** - but Railway might need explicit build configuration.

### Option 2: Update Root Procfile

The root `Procfile` has `web: cd apps/backend && npm run start`, which is for the backend service, not mandate service.

For mandate service, Railway should use `apps/mandate-service/Procfile`:
```
web: cd apps/mandate-service && node dist/server.js
```

But since root directory is blank, Railway might be using the root Procfile incorrectly.

### Option 3: Explicit Build Configuration

Tell Railway Railpack explicitly what to do in build vs start phases.

## Current Status

**What's happening:**
- ✅ `postinstall` runs → TypeScript is built
- ❌ Railway Railpack also tries to run `npm run start` during build
- ❌ Server starts during build → Hangs/timeouts

**What should happen:**
- ✅ `postinstall` runs → TypeScript is built
- ✅ Build phase completes (no server start)
- ✅ Deploy phase → Server starts from `Procfile`

## Verification

After fix, build logs should show:
1. Install dependencies
2. `postinstall` runs → Builds TypeScript
3. Build phase completes (no server start)
4. Deploy phase → Server starts

## Next Steps

1. Check Railway settings for build configuration
2. Ensure `postinstall` is running (it should automatically)
3. Verify Procfile is correct for mandate service
4. Test deployment after fix
