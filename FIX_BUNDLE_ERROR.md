# Fix: "Unable to load script" Error

## Problem

The app shows: **"Unable to load script. Make sure you're either running Metro (run 'npx react-native start') or that your bundle 'index.android.bundle' is packaged correctly for release."**

## Root Cause

Your app is configured to use `.expo/.virtual-metro-entry` (see `MainApplication.kt` line 29), which means:
- **Debug builds**: Require Metro bundler to be running
- **Release builds**: Bundle should be embedded in APK

## Solution

### For DEBUG Builds (Most Common)

**Metro bundler must be running!**

1. **Open a new terminal/command prompt**

2. **Start Metro**:
   ```bash
   cd C:\AgenticCommerce\apps\mobile
   npx expo start
   ```

3. **Wait for Metro to start** - You'll see:
   ```
   Metro waiting on exp://192.168.x.x:8081
   ```

4. **Keep Metro running** and run the app from Android Studio

5. **The app should now connect to Metro and load!**

### For RELEASE Builds

The bundle should be automatically created. If it's missing:

1. **Rebuild release APK**:
   ```bash
   cd C:\AgenticCommerce\apps\mobile\android
   gradlew.bat clean
   gradlew.bat assembleRelease
   ```

2. **Install the APK** from:
   ```
   app\build\outputs\apk\release\app-release.apk
   ```

## Quick Test

### Test Debug Build:

**Terminal 1** - Start Metro:
```bash
cd C:\AgenticCommerce\apps\mobile
npx expo start
```

**Android Studio** - Run the app:
- Click **Run** button (▶️)
- App should connect to Metro and load

### Test Release Build:

```bash
cd C:\AgenticCommerce\apps\mobile\android
gradlew.bat assembleRelease
# Install APK from: app\build\outputs\apk\release\app-release.apk
```

## Why This Happens

- **Debug builds** = App loads JS from Metro (development server)
- **Release builds** = JS bundle embedded in APK

If you run a debug build without Metro, you get this error!

## Verification

✅ **Debug build working**:
- Metro bundler running
- App connects (check Metro logs)
- No "Unable to load script" error

✅ **Release build working**:
- Bundle file exists: `app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle`
- APK runs without Metro
- App loads successfully

## Summary

**The fix is simple**: Start Metro bundler for debug builds!

```bash
cd C:\AgenticCommerce\apps\mobile
npx expo start
```

Then run the app from Android Studio. The error will disappear!

