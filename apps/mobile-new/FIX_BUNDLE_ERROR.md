# Fix: "Unable to load script" Error

## Problem

The app shows this error:
```
Unable to load script.
Make sure you're running Metro or that your bundle 'index.android.bundle' is packaged correctly for release.
```

This happens because the **debug APK** doesn't include the JavaScript bundle - it expects Metro bundler to be running.

## Solution: Run Metro Bundler

### Option 1: Using Expo CLI (Recommended)

1. **Start Metro:**
   ```bash
   cd apps/mobile-new
   npx expo start --dev-client
   ```

2. **Set up port forwarding:**
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```

3. **Launch the app** - It will now connect to Metro and load the bundle

### Option 2: Build Release APK (Standalone)

If you want a standalone APK that doesn't need Metro:

```bash
cd apps/mobile-new/android
.\gradlew.bat assembleRelease
```

**Note:** Release builds need to be signed. You'll find the APK at:
`android/app/build/outputs/apk/release/app-release.apk`

### Option 3: Use Android Studio

1. **Start Metro bundler:**
   ```bash
   cd apps/mobile-new
   npx expo start
   ```

2. **In Android Studio:**
   - Click the Run button (▶️)
   - Metro will bundle the JavaScript
   - App will connect to Metro automatically

## Quick Fix Commands

Run these in order:

```bash
# 1. Navigate to app directory
cd apps/mobile-new

# 2. Set up port forwarding (for emulator/device)
adb reverse tcp:8081 tcp:8081

# 3. Start Metro bundler
npx expo start --dev-client
```

Then **reload the app** on your device (shake device > Reload, or press R+R in Metro terminal).

## Verify Metro is Running

You should see:
- Metro bundler terminal with QR code
- "Metro waiting on..." message
- No errors

## If Still Not Working

1. **Check device connection:**
   ```bash
   adb devices
   ```

2. **Clear Metro cache:**
   ```bash
   npx expo start --clear
   ```

3. **Rebuild and reinstall:**
   ```bash
   cd android
   .\gradlew.bat clean
   .\gradlew.bat installDebug
   ```

4. **Check Metro is accessible:**
   - On emulator: Should work automatically with `adb reverse`
   - On physical device: Make sure device and computer are on same Wi-Fi network

---

**The Metro bundler is now running!** Reload the app and it should work. 🚀

