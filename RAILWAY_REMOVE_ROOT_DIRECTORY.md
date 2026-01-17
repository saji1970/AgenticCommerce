# CRITICAL: Remove Root Directory Setting for Mandate Service

## Problem

When Root Directory is set to `apps/mandate-service` in Railway:
- Railway only copies `apps/mandate-service/` directory
- Workspace packages (`packages/shared-types`, `packages/validation`) are NOT copied
- Root `package.json` and `pnpm-lock.yaml` are NOT copied
- pnpm workspace dependencies fail: `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`

## Solution: Remove Root Directory Setting

**YOU MUST DO THIS IN RAILWAY DASHBOARD:**

1. Go to Railway Dashboard
2. Open service **"pure-wonder"** (ID: `025ad39c-870a-486a-901d-db9a2d6671d9`)
3. Click **Settings** tab
4. Find **"Root Directory"** field
5. **CLEAR IT** (set to blank/empty)
6. **Save** settings

## Why This Works

When Root Directory is **NOT set** (blank):
- Railway copies the **entire repository**
- All workspace packages are available
- Root `package.json` and `pnpm-lock.yaml` are available
- pnpm workspaces work correctly
- Build commands can navigate to `apps/mandate-service`

## Updated Configuration

The `nixpacks.toml` is now configured to work from repository root:

```toml
[phases.install]
cmds = [
  "npm install -g pnpm corepack",
  "corepack enable",
  "pnpm install --frozen-lockfile"  # Works from repo root
]

[phases.build]
cmds = [
  "pnpm build:shared",  # Builds workspace packages
  "cd apps/mandate-service && pnpm run build"  # Builds service
]

[start]
cmd = "cd apps/mandate-service && node dist/server.js"  # Starts service
```

## Build Flow (After Removing Root Directory)

1. **Setup**: Install Node.js
2. **Install**: 
   - Install pnpm
   - Install all dependencies from repo root
   - Workspace packages are available
3. **Build**:
   - Build shared packages (`packages/shared-types`, `packages/validation`)
   - Build mandate service TypeScript
4. **Start**: 
   - Navigate to `apps/mandate-service`
   - Run `node dist/server.js`

## Verification

After removing root directory and deploying:

1. **Check Logs** - Should show:
   ```
   🚀 Mandate Service running on port 3001
   📡 Environment: production
   ```

2. **Test Health Endpoint:**
   ```bash
   curl https://pure-wonder-production.up.railway.app/health
   ```
   Should return: `{"status":"ok","service":"mandate-service"}`

## Why Root Directory Doesn't Work for Monorepos

Railway's Root Directory feature is designed for:
- ✅ Single-package projects
- ✅ Projects where service is at repo root

For monorepos with workspaces:
- ❌ Root directory excludes parent directories
- ❌ Workspace packages are not accessible
- ❌ pnpm workspace dependencies fail

## Summary

**ACTION REQUIRED:**
1. Remove Root Directory setting in Railway Dashboard
2. Leave it blank/empty
3. Railway will build from repository root
4. All workspace files will be available
5. Build will succeed

The `nixpacks.toml` is already configured correctly for this setup.
