# Mandate App - Android APK Build & Deploy

## Local APK Location

**Debug APK** (built):
```
apps/mandate-app/android/app/build/outputs/apk/debug/app-debug.apk
```

## Build Commands

### Debug APK (no signing required)
```bash
cd apps/mandate-app/android
.\gradlew.bat assembleDebug
```

### Release APK (requires keystore)
```bash
cd apps/mandate-app/android
.\gradlew.bat assembleRelease
```
Configure signing in `android/app/build.gradle` with your keystore.

## Deploy in Android Studio

### Option 1: Open project and run
1. Open **Android Studio**
2. **File → Open** → Select `c:\AgenticCommerce\apps\mandate-app\android`
3. Wait for Gradle sync
4. Connect device or start emulator
5. Click **Run** (green play) or **Shift+F10**

### Option 2: Install APK on device
1. Copy `app-debug.apk` to your Android device
2. Enable **Install from unknown sources** in device settings
3. Tap the APK file to install

### Option 3: ADB install
```bash
adb install apps/mandate-app/android/app/build/outputs/apk/debug/app-debug.apk
```

## Run from project root
```bash
cd c:\AgenticCommerce
pnpm --filter @agentic-commerce/user-mandate-app android
```
