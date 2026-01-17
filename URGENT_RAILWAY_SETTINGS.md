# URGENT: Railway Settings Fix Required

## Current Error
```
ERR_PNPM_NO_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is absent
```

## Root Cause
**Root Directory is still set to `apps/mandate-service` in Railway Dashboard**

This causes:
1. Only `apps/mandate-service/` directory is copied
2. Root `pnpm-lock.yaml` is NOT copied
3. Workspace packages are NOT copied
4. Build fails

## IMMEDIATE FIX REQUIRED

### Step 1: Remove Root Directory Setting

1. Go to **Railway Dashboard**
2. Open service **"pure-wonder"** (ID: `025ad39c-870a-486a-901d-db9a2d6671d9`)
3. Click **Settings** tab
4. Find **"Root Directory"** field
5. **DELETE/CLEAR the value** (set to empty/blank)
6. Click **Save**

### Step 2: Verify

After removing root directory:
- Railway will copy entire repository
- `pnpm-lock.yaml` will be available
- Workspace packages will be available
- Build will succeed

## Temporary Workaround Applied

I've updated `nixpacks.toml` to use `--no-frozen-lockfile` as a temporary fix, but:

⚠️ **This will still fail** if root directory is set because workspace packages won't be available.

## Why Root Directory Must Be Removed

For pnpm monorepos with workspaces:
- ✅ Root directory = BLANK → Entire repo copied → Works
- ❌ Root directory = `apps/mandate-service` → Only service copied → Fails

## After Removing Root Directory

Once root directory is removed, we can change back to `--frozen-lockfile` for better security:

```toml
[phases.install]
cmds = [
  "npm install -g pnpm corepack",
  "corepack enable",
  "pnpm install --frozen-lockfile"  # Will work from repo root
]
```

## Summary

**ACTION REQUIRED NOW:**
1. Remove Root Directory setting in Railway Dashboard
2. Leave it blank/empty
3. Redeploy service
4. Build should succeed

The code is ready - you just need to update Railway settings.
