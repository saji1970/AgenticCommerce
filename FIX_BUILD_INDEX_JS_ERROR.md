# Fix "Unable to resolve module ./index.js" Build Error

## Problem

When building the APK locally, you get this error:
```
Error: Unable to resolve module ./index.js from C:\AgenticCommerce/.:
```

This happens because Metro bundler is trying to resolve `index.js` from the **workspace root** (`C:\AgenticCommerce`) instead of the **app root** (`C:\AgenticCommerce\apps\mobile`).

## Root Cause

The Gradle build is running from `apps/mobile/android`, but when Expo's `export:embed` command runs, it's detecting the wrong project root (workspace root instead of app root).

## Solution: Set NODE_ENV and Ensure Correct Directory

The build needs to run with the correct working directory and environment variables.

### Option 1: Use `expo run:android` (Recommended)

Instead of using Gradle directly, use Expo's build command which handles the directory correctly:

```powershell
cd apps/mobile
npx expo run:android --variant release
```

This command:
- Automatically sets up the correct working directory
- Handles Metro bundler configuration correctly
- Builds and installs the APK

The APK will be at: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

### Option 2: Fix Gradle Build with Environment Variable

If you must use Gradle directly, set `NODE_ENV` before building:

**PowerShell:**
```powershell
cd apps/mobile/android

# Set NODE_ENV
$env:NODE_ENV = "production"

# Build
.\gradlew assembleRelease

# Or set inline
$env:NODE_ENV = "production"; .\gradlew assembleRelease
```

**Command Prompt:**
```cmd
cd apps\mobile\android

REM Set NODE_ENV
set NODE_ENV=production

REM Build
gradlew.bat assembleRelease
```

### Option 3: Use Updated Build Script

The updated `build-local-apk.ps1` script should handle this, but make sure you're running it from `apps/mobile`:

```powershell
cd apps/mobile
.\build-local-apk.ps1
```

## Quick Fix

The simplest solution is to use Expo's build command:

```powershell
cd apps/mobile
npx expo run:android --variant release
```

This avoids the directory resolution issues entirely.

