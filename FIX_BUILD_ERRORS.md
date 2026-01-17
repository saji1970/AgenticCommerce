# Fix Build Errors - Mandate Service

## Issues Fixed

### 1. TypeScript Error: Missing `agent_id` in UpdateAIAgentAppRequest

**Error:**
```
src/services/ai-agent-app.service.ts(64,14): error TS2339: Property 'agent_id' does not exist on type 'UpdateAIAgentAppRequest'.
```

**Fix:**
- Added `agent_id?: string;` to `UpdateAIAgentAppRequest` interface
- Added handling for `agent_id` in repository `update()` method

### 2. Nixpacks Path Error: Cannot find package.json

**Error:**
```
ERR_PNPM_NO_PKG_MANIFEST  No package.json found in /
```

**Root Cause:**
When Railway sets root directory to `apps/mandate-service`, the working directory is `/app` (which is `apps/mandate-service`). The nixpacks.toml was using `cd ../..` which goes to `/` (root), not the repo root.

**Fix:**
Changed paths in `nixpacks.toml`:
- From: `cd ../.. && pnpm install` (goes to `/`)
- To: `cd .. && pnpm install` (goes to repo root)

**Note:** The `postinstall` script in `package.json` already handles building shared packages and the service, so the build phase in nixpacks.toml might be redundant. However, keeping it ensures the build happens even if postinstall doesn't run.

## Current Configuration

### nixpacks.toml
```toml
[phases.install]
cmds = [
  "npm install -g pnpm corepack",
  "corepack enable",
  "cd .. && pnpm install --frozen-lockfile"
]

[phases.build]
cmds = [
  "cd .. && pnpm build:shared",
  "pnpm run build"
]
```

### package.json postinstall
```json
"postinstall": "cd ../.. && pnpm build:shared && cd apps/mandate-service && pnpm run build"
```

**Note:** The postinstall uses `cd ../..` because it runs from `apps/mandate-service` directory, so it needs to go up two levels to reach repo root. The nixpacks commands use `cd ..` because Railway sets the working directory differently.

## Important: Root Directory Must Be Set

**CRITICAL**: Set Root Directory in Railway Dashboard to `apps/mandate-service`

Without this:
- Railway builds from repo root
- Uses wrong nixpacks.toml
- Paths are incorrect
- Build fails

## Expected Build Flow

1. **Setup**: Install Node.js
2. **Install**: 
   - Install pnpm
   - Go to repo root (`cd ..`)
   - Install dependencies (`pnpm install`)
   - postinstall hook runs:
     - Build shared packages
     - Build mandate service
3. **Build** (if postinstall didn't complete):
   - Build shared packages
   - Build mandate service
4. **Start**: Run `node dist/server.js`

## Verification

After deployment, check logs for:
```
🚀 Mandate Service running on port 3001
```

Test health endpoint:
```bash
curl https://pure-wonder-production.up.railway.app/health
```
