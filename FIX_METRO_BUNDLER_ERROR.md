# Fix "Unable to load script" Error

This error occurs when using a **development build** APK that needs to connect to Metro bundler, but Metro isn't running or accessible.

## Solution Options

### Option 1: Start Metro Bundler (For Development Builds)

If you're using a development build APK (built with `developmentClient: true`), you need Metro bundler running:

1. **Start Metro bundler:**
   ```powershell
   cd apps/mobile
   npx expo start --dev-client
   ```

2. **Connect your device/emulator:**
   - **Physical device via USB:** Run this command:
     ```powershell
     adb reverse tcp:8081 tcp:8081
     ```
   - **Physical device via Wi-Fi:** Ensure device and computer are on the same network
   - **Emulator:** Should connect automatically

3. **Open the app** on your device/emulator - it should connect to Metro automatically

### Option 2: Build a Standalone APK (Recommended for Testing)

For local testing without Metro bundler, build a standalone APK that includes the JavaScript bundle:

**Using Gradle (Local Build):**
```powershell
cd apps/mobile/android
.\gradlew assembleRelease
```

The APK will be at: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

**Using Expo CLI:**
```powershell
cd apps/mobile
npx expo run:android --variant release
```

This builds a standalone APK with the JavaScript bundle included.

### Option 3: Use Preview/Production Build Profile

Build using preview or production profile (not development):

```powershell
# Using EAS (cloud)
eas build --platform android --profile preview

# Or locally (if you have the setup)
cd apps/mobile
npx expo run:android --variant release
```

Preview/Production builds include the JavaScript bundle and don't require Metro.

## Quick Fix Checklist

- [ ] If using development build → Start Metro: `npx expo start --dev-client`
- [ ] If USB connected → Run: `adb reverse tcp:8081 tcp:8081`
- [ ] If Wi-Fi → Ensure same network
- [ ] For standalone APK → Build release variant: `.\gradlew assembleRelease`

## Still Getting the Boolean Cast Error?

The `java.lang.String cannot be cast to java.lang.Boolean` error is from `@react-native-community/datetimepicker` not being compatible with Expo Go. 

**Solution:** Use a development build or standalone APK (not Expo Go). See `EXPO_GO_COMPATIBILITY_FIX.md` for details.

