# Fix: "Unable to load script" Error - Complete Solution

## Problem Analysis

The error "Unable to load script" occurs because:

1. **For DEBUG builds**: The app is configured to use `.expo/.virtual-metro-entry` which requires Metro bundler to be running
2. **For RELEASE builds**: The bundle might not be properly embedded or the app is still trying to connect to Metro

## Root Cause

Looking at `MainApplication.kt`:
```kotlin
override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"
```

This entry point requires Metro bundler for debug builds. For release builds, the bundle should be embedded, but the app might still be trying to use the Metro entry point.

## Solutions

### Solution 1: For DEBUG Builds (Development) - Start Metro

**This is the most common fix:**

1. **Start Metro Bundler**:
   ```bash
   cd C:\AgenticCommerce\apps\mobile
   npx expo start
   ```

2. **Or use the script**:
   - Double-click: `apps/mobile/start-metro.bat`

3. **Keep Metro running** and run the app from Android Studio

### Solution 2: For RELEASE Builds - Ensure Bundle is Embedded

The bundle should be automatically created during build. Verify:

1. **Check if bundle was created**:
   ```bash
   cd apps/mobile/android
   dir app\build\generated\assets\createBundleReleaseJsAndAssets\index.android.bundle
   ```

2. **If bundle is missing, rebuild**:
   ```bash
   cd apps/mobile/android
   gradlew.bat clean
   gradlew.bat assembleRelease
   ```

3. **Verify the bundle task ran**:
   - Look for `:app:createBundleReleaseJsAndAssets` in build output
   - This task should create the bundle file

### Solution 3: Fix MainApplication for Release Builds

If release builds still try to use Metro, we need to ensure the bundle is loaded from assets instead of Metro.

**Check the build configuration** - The `bundleCommand = "export:embed"` should embed the bundle for release builds.

## Quick Diagnostic Steps

### Step 1: Check Build Type

In Android Studio:
- **Build Variants** tab (usually bottom left)
- Check if you're building **debug** or **release**

### Step 2: Check Metro Status

For **debug builds**:
- Metro must be running
- Check terminal/command prompt for Metro output
- Should see: `Metro waiting on exp://...`

### Step 3: Check Bundle File

For **release builds**:
```bash
cd apps/mobile/android
Test-Path "app\build\generated\assets\createBundleReleaseJsAndAssets\index.android.bundle"
```

If `False`, the bundle wasn't created during build.

## Complete Fix Procedure

### For Debug Builds:

1. **Terminal 1** - Start Metro:
   ```bash
   cd C:\AgenticCommerce\apps\mobile
   npx expo start
   ```

2. **Android Studio** - Run the app:
   - Select **debug** build variant
   - Click **Run** button (▶️)
   - App should connect to Metro and load

### For Release Builds:

1. **Build release APK**:
   ```bash
   cd C:\AgenticCommerce\apps\mobile\android
   gradlew.bat clean
   gradlew.bat assembleRelease
   ```

2. **Verify bundle exists**:
   ```bash
   dir app\build\generated\assets\createBundleReleaseJsAndAssets\index.android.bundle
   ```

3. **Install APK**:
   - Location: `app\build\outputs\apk\release\app-release.apk`
   - Install on device
   - Should work without Metro

## If Still Not Working

### Check Logcat in Android Studio:

1. Open **Logcat** tab
2. Filter by: `com.agenticcommerce.app`
3. Look for errors related to:
   - `JSBundleLoader`
   - `CatalystInstanceImpl`
   - `Unable to load script`

### Common Logcat Errors:

**Error 1**: `Metro connection refused`
- **Fix**: Start Metro bundler

**Error 2**: `Bundle file not found`
- **Fix**: Rebuild release APK with `gradlew.bat assembleRelease`

**Error 3**: `Unable to resolve module`
- **Fix**: Clear Metro cache: `npx expo start --clear`

## Verification Checklist

- [ ] Metro bundler running (for debug builds)
- [ ] Bundle file exists (for release builds)
- [ ] Build completed successfully
- [ ] App installed on device/emulator
- [ ] No errors in Logcat
- [ ] Network connectivity (for Metro connection)

## Summary

- **Debug Build** = Requires Metro running (`npx expo start`)
- **Release Build** = Bundle embedded in APK (automatic)

The most common issue is running a debug build without Metro started!

