# Nixpacks Node.js Package Name Fix

## Error
```
error: undefined variable 'nodejs-20_x'
```

## Root Cause
Nixpacks doesn't recognize `nodejs-20_x` as a valid package name. The format was incorrect.

## Solution

Changed from:
```toml
nixPkgs = ["nodejs-20_x"]
```

To:
```toml
nixPkgs = ["nodejs"]
```

Nixpacks will automatically use the latest stable Node.js version, or you can specify a version using the `NODE_VERSION` environment variable if needed.

## Alternative Formats (if needed)

If you need a specific Node.js version, you can:

1. **Use environment variable:**
   - Set `NODE_VERSION=20` in Railway environment variables
   - Use `nixPkgs = ["nodejs"]` in nixpacks.toml

2. **Use version in package.json:**
   - Nixpacks will read `engines.node` from package.json
   - Add to `apps/mandate-service/package.json`:
     ```json
     "engines": {
       "node": ">=20.0.0"
     }
     ```

## Current Configuration

The `nixpacks.toml` now uses:
```toml
[phases.setup]
nixPkgs = ["nodejs"]
```

This will work with Nixpacks and Railway will install Node.js automatically.

## Important: Root Directory Must Be Set

**CRITICAL**: You must set the Root Directory in Railway Dashboard to `apps/mandate-service` for Nixpacks to use the correct `nixpacks.toml` file.

Without this:
- Railway uses root `nixpacks.toml` (for backend)
- Build commands are wrong
- Service won't build correctly

## Build Flow (After Fix)

1. **Setup**: Install Node.js (via `nodejs` package)
2. **Install**: Install dependencies with pnpm
3. **Build**: 
   - Build shared packages
   - Build mandate service TypeScript
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
