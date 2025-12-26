# Fix: "Unable to load script" Error

## Problem

The app shows: **"Unable to load script. Make sure you're either running Metro (run 'npx react-native start') or that your bundle 'index.android.bundle' is packaged correctly for release."**

## Solution

This error occurs because the JavaScript bundle isn't available. The solution depends on your build type:

---

## For DEBUG Builds (Development)

**Metro Bundler must be running** when you launch a debug build.

### Quick Fix:

1. **Start Metro Bundler** (choose one method):

   **Option A: Use the script**
   ```bash
   # Double-click or run:
   apps/mobile/start-metro.bat
   ```

   **Option B: Manual command**
   ```bash
   cd apps/mobile
   npx expo start
   ```

   **Option C: In Android Studio**
   - Open terminal in Android Studio (bottom panel)
   - Run: `cd apps/mobile && npx expo start`

2. **Wait for Metro to start** - You should see:
   ```
   Metro waiting on exp://192.168.x.x:8081
   ```

3. **Run the app** from Android Studio (click Run button ▶️)

4. **Keep Metro running** - Don't close the Metro window while developing

---

## For RELEASE Builds (Production)

The bundle should be automatically created during the build. If it's missing:

### Fix:

1. **Rebuild the release APK**:
   ```bash
   cd apps/mobile/android
   gradlew.bat clean
   gradlew.bat assembleRelease
   ```

2. **Verify bundle was created**:
   - Check: `apps/mobile/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle`
   - This file should exist after building

3. **Reinstall the APK** on your device

---

## Quick Test

### Test Debug Build:

1. **Terminal 1** - Start Metro:
   ```bash
   cd apps/mobile
   npx expo start
   ```

2. **Terminal 2** - Build and run:
   ```bash
   cd apps/mobile/android
   gradlew.bat installDebug
   ```

   Or use Android Studio: Click **Run** button

### Test Release Build:

```bash
cd apps/mobile/android
gradlew.bat clean
gradlew.bat assembleRelease
# Install the APK from: app/build/outputs/apk/release/app-release.apk
```

---

## Common Issues

### Issue: Metro starts but app still can't connect

**Solution:**
1. Check your device/emulator and computer are on the same network
2. Shake device → **Dev Settings** → **Debug server host** → Enter your computer's IP: `192.168.x.x:8081`
3. Or use USB debugging: Shake device → **Dev Settings** → **Debug server host** → `localhost:8081`

### Issue: "Metro bundler has encountered an error"

**Solution:**
1. Clear Metro cache:
   ```bash
   cd apps/mobile
   npx expo start --clear
   ```

2. Clear node_modules and reinstall:
   ```bash
   cd apps/mobile
   rm -rf node_modules
   npm install
   ```

### Issue: Release build missing bundle

**Solution:**
1. Ensure build completed successfully (check Build tab in Android Studio)
2. Look for this task in build output: `:app:createBundleReleaseJsAndAssets`
3. If missing, rebuild:
   ```bash
   cd apps/mobile/android
   gradlew.bat clean
   gradlew.bat assembleRelease --info
   ```

---

## Verification

### Debug Build Working:
- ✅ Metro bundler running
- ✅ App connects to Metro (check Metro logs)
- ✅ App loads without "Unable to load script" error

### Release Build Working:
- ✅ Bundle file exists: `app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle`
- ✅ APK installs and runs without Metro
- ✅ App loads without errors

---

## Summary

- **Debug builds** = Need Metro running (`npx expo start`)
- **Release builds** = Bundle included in APK (automatic during build)

The most common issue is forgetting to start Metro for debug builds!

