# Fix Railway Build Error - Mandate Service

## Error
```
Error: Cannot find module '/app/apps/mandate-service/dist/server.js'
```

## Root Cause
Railway was trying to start the service before building TypeScript. The build phase wasn't compiling the code.

## Solution Applied

1. **Removed Procfile** from `apps/mandate-service/` - Railway was using it incorrectly
2. **Fixed nixpacks.toml** - Build phase now properly compiles TypeScript
3. **Updated railway.json** - Start command assumes root directory is set correctly

## Configuration Details

### nixpacks.toml
- **Install**: Installs dependencies from repo root
- **Build**: 
  1. Builds shared packages from root
  2. Builds mandate service TypeScript
- **Start**: Runs compiled `dist/server.js`

### railway.json
- Uses NIXPACKS builder
- Start command: `node dist/server.js` (assumes root directory is `apps/mandate-service`)

## Critical Step: Set Root Directory

**MUST DO THIS IN RAILWAY DASHBOARD:**

1. Go to service **"pure-wonder"**
2. **Settings** → **Root Directory**
3. Set to: `apps/mandate-service`
4. **Save**

Without this, Railway will build from the wrong directory and paths will be incorrect.

## Expected Build Flow

1. **Install Phase:**
   ```
   - Install pnpm
   - Go to repo root
   - Install all dependencies
   ```

2. **Build Phase:**
   ```
   - Go to repo root
   - Build shared packages (pnpm build:shared)
   - Build mandate service (pnpm run build)
   - Output: apps/mandate-service/dist/
   ```

3. **Start Phase:**
   ```
   - Run: node dist/server.js
   - Service starts on Railway-assigned port
   ```

## Verification

After deployment, check logs for:
```
🚀 Mandate Service running on port 3001
📡 Environment: production
🔗 Health check: http://localhost:3001/health
```

Test health endpoint:
```bash
curl https://pure-wonder-production.up.railway.app/health
```

Should return: `{"status":"ok","service":"mandate-service"}`
