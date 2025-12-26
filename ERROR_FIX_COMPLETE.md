# ✅ Complete Fix: "Unable to load script" Error

## The Problem

Your app shows: **"Unable to load script. Make sure you're either running Metro (run 'npx react-native start') or that your bundle 'index.android.bundle' is packaged correctly for release."**

## Why This Happens

Your app uses `.expo/.virtual-metro-entry` (configured in `MainApplication.kt`), which means:
- **Debug builds**: Require Metro bundler running (loads JS from development server)
- **Release builds**: Bundle embedded in APK (works standalone)

## ✅ The Fix

### For DEBUG Builds (Most Common)

**You MUST start Metro bundler before running the app!**

#### Option 1: Use the Script (Easiest)

1. **Double-click**: `apps/mobile/run-app.bat`
   - This starts Metro in a separate window
   - Keep it running while developing

2. **Then run the app** from Android Studio

#### Option 2: Manual Start

1. **Open a terminal/command prompt**

2. **Run**:
   ```bash
   cd C:\AgenticCommerce\apps\mobile
   npx expo start
   ```

3. **Wait for Metro to start** - You'll see:
   ```
   Metro waiting on exp://192.168.x.x:8081
   ```

4. **Keep Metro running** and run the app from Android Studio

#### Option 3: In Android Studio Terminal

1. Open **Terminal** tab (bottom of Android Studio)
2. Run:
   ```bash
   cd C:\AgenticCommerce\apps\mobile
   npx expo start
   ```
3. Keep terminal open and run the app

### For RELEASE Builds

The bundle is automatically created during build. If you get this error on release:

1. **Rebuild the release APK**:
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

1. **Start Metro** (in a terminal):
   ```bash
   cd C:\AgenticCommerce\apps\mobile
   npx expo start
   ```

2. **In Android Studio**:
   - Make sure **Build Variants** shows **debug**
   - Click **Run** button (▶️)
   - App should connect to Metro and load!

### Test Release Build:

```bash
cd C:\AgenticCommerce\apps\mobile\android
gradlew.bat assembleRelease
# Install APK from: app\build\outputs\apk\release\app-release.apk
```

## Verification

✅ **Working correctly when**:
- Metro bundler is running (for debug)
- App connects to Metro (check Metro logs)
- No "Unable to load script" error
- App loads and displays UI

## Common Issues & Fixes

### Issue: Metro starts but app can't connect

**Fix**:
1. Check device/emulator and computer are on same network
2. Shake device → **Dev Settings** → **Debug server host**
3. Enter your computer's IP: `192.168.x.x:8081`
4. Or use USB: `localhost:8081`

### Issue: "Metro bundler has encountered an error"

**Fix**:
```bash
cd C:\AgenticCommerce\apps\mobile
npx expo start --clear
```

### Issue: Still getting error after starting Metro

**Fix**:
1. Stop Metro (Ctrl+C)
2. Clear cache: `npx expo start --clear`
3. Restart Metro
4. Rebuild app in Android Studio

## Summary

**The fix is simple**: Start Metro bundler before running debug builds!

```bash
cd C:\AgenticCommerce\apps\mobile
npx expo start
```

Then run the app from Android Studio. The error will disappear! ✅

---

## Files Created

- `apps/mobile/run-app.bat` - Script to start Metro automatically
- `apps/mobile/start-metro.bat` - Simple Metro starter
- This guide - Complete fix documentation

