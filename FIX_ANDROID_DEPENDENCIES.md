# Fix Android Build Dependency Issues

## Problem Summary

When building Android APK locally, you may encounter:
1. **"Unable to resolve module ./index.js"** - Metro bundler looking in wrong directory
2. **"NODE_ENV environment variable is required"** - Missing environment variable
3. **Build failures** - Incorrect working directory configuration

## Root Causes

1. **Metro Bundler Directory Issue**: Metro bundler tries to resolve `index.js` from workspace root (`C:\AgenticCommerce`) instead of app root (`apps\mobile`)
2. **NODE_ENV Not Set**: Metro bundler requires `NODE_ENV` to be set for proper configuration
3. **Working Directory**: Gradle builds need to run from correct context

## Solutions

### Solution 1: Use Expo CLI (Recommended)

Expo CLI handles all directory and configuration setup automatically:

```powershell
cd apps/mobile

# Set NODE_ENV
$env:NODE_ENV = "production"

# Build
npx expo run:android --variant release
```

**Advantages:**
- Automatically sets correct working directory
- Handles Metro bundler configuration
- No manual path setup needed
- Builds and optionally installs APK

### Solution 2: Use Build Script

Use the provided build script which handles everything:

```powershell
cd apps/mobile
.\build-local-apk.ps1
```

The script:
- Sets NODE_ENV automatically
- Verifies directory structure
- Runs Gradle build correctly

### Solution 3: Manual Gradle Build (Advanced)

If you must use Gradle directly:

```powershell
cd apps/mobile

# IMPORTANT: Set NODE_ENV first
$env:NODE_ENV = "production"

# Navigate to Android directory
cd android

# Build
.\gradlew assembleRelease
```

## Why NODE_ENV is Required

Metro bundler uses `NODE_ENV` to:
- Determine which configuration to use (development vs production)
- Resolve project root correctly
- Configure module resolution paths
- Enable proper asset bundling

Without `NODE_ENV`, Metro may:
- Look for `index.js` in wrong directory
- Use incorrect Metro config
- Fail to resolve dependencies correctly

## Quick Fix Checklist

- [ ] Run from `apps/mobile` directory (not workspace root)
- [ ] Set `NODE_ENV=production` before building
- [ ] Use `npx expo run:android` (recommended) OR
- [ ] Use `.\build-local-apk.ps1` script OR
- [ ] If using Gradle directly, set `NODE_ENV` first

## Verification

After fixing, verify the build:

1. **Check APK exists:**
   ```powershell
   Test-Path "apps\mobile\android\app\build\outputs\apk\release\app-release.apk"
   ```

2. **Verify APK size** (should be > 20MB):
   ```powershell
   (Get-Item "apps\mobile\android\app\build\outputs\apk\release\app-release.apk").Length / 1MB
   ```

## Additional Notes

- The build scripts (`build-local-apk.ps1` and `build-local-apk.bat`) now set `NODE_ENV` automatically
- Always run build commands from `apps/mobile` directory, not from workspace root
- Use `npx expo run:android` for the most reliable builds
- For development builds, use `npx expo run:android --variant debug`

