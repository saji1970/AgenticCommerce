# Railway Monorepo Root Directory Issue

## Problem

When Railway root directory is set to `apps/mandate-service`, Railway only copies that directory, excluding:
- Root `package.json`
- Root `pnpm-lock.yaml`
- Root `pnpm-workspace.yaml`
- Other workspace packages

This breaks pnpm workspace functionality.

## Solution Options

### Option 1: Don't Set Root Directory (Recommended)

**Best for monorepos with pnpm workspaces:**

1. **Don't set Root Directory** in Railway settings (leave it blank)
2. Railway will build from repository root
3. Use `nixpacks.toml` or build commands to:
   - Install dependencies from root
   - Build shared packages
   - Build mandate service
   - Start from `apps/mandate-service`

**Configuration:**
```toml
[phases.install]
cmds = [
  "npm install -g pnpm corepack",
  "corepack enable",
  "pnpm install --frozen-lockfile"  # From repo root
]

[phases.build]
cmds = [
  "pnpm build:shared",
  "cd apps/mandate-service && pnpm run build"
]

[start]
cmd = "cd apps/mandate-service && node dist/server.js"
```

### Option 2: Use --no-frozen-lockfile (Current Fix)

**Temporary workaround:**

- Remove `--frozen-lockfile` flag
- Allows pnpm to generate lockfile if missing
- Less secure but works when root directory is set

**Configuration:**
```toml
[phases.install]
cmds = [
  "npm install -g pnpm corepack",
  "corepack enable",
  "pnpm install --no-frozen-lockfile"  # Allows missing lockfile
]
```

### Option 3: Copy Lockfile to Service Directory

**Not recommended** - breaks monorepo structure

## Recommended Approach

**For pure-wonder service:**

1. **Remove Root Directory setting** in Railway Dashboard
2. Railway will use repository root
3. Use the nixpacks.toml configuration above
4. All workspace files will be available

## Why This Happens

Railway's root directory feature is designed for:
- Single-package projects
- Projects where the service is at the repo root

For monorepos with workspaces:
- Root directory setting excludes parent files
- pnpm workspaces require root `package.json` and `pnpm-lock.yaml`
- Workspace packages need to be accessible

## Verification

After removing root directory setting:

1. Railway copies entire repository
2. `pnpm install` finds `pnpm-lock.yaml` at root
3. Workspace packages are accessible
4. Build succeeds

## Current Status

Using Option 2 (--no-frozen-lockfile) as temporary fix until root directory is removed.
