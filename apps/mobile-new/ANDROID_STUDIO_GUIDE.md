# Android Studio Setup Guide

## ✅ Native Android Project Generated

The Android native project has been generated in the `android/` directory.

## 📱 Opening in Android Studio

### Step 1: Open Android Studio

1. Launch **Android Studio**
2. Click **"Open"** (or **File > Open**)
3. Navigate to: `C:\AgenticCommerce\apps\mobile-new\android`
4. Select the `android` folder
5. Click **OK**

### Step 2: Wait for Gradle Sync

- Android Studio will automatically sync Gradle
- This may take 5-10 minutes on first open
- Wait for the sync to complete (status shown at bottom)

### Step 3: Run the App

**Option A: Using Android Studio**

1. Connect an Android device via USB (or start an emulator)
2. Click the **Run** button (green play icon) in toolbar
3. Select your device/emulator
4. The app will build and install automatically

**Option B: Using Command Line**

```bash
cd apps/mobile-new/android
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

## 🔧 Important Notes

### Plugins

The native plugins (expo-location, expo-local-authentication, expo-secure-store) may need to be configured manually in Android Studio if you want to use those features. The basic app functionality will work without them.

To add plugins later:
1. Run: `npx expo prebuild --platform android` (after fixing plugin issues)
2. Or manually add native dependencies in `android/app/build.gradle`

### Metro Bundler

When running from Android Studio, you still need Metro bundler running:

**Terminal 1 (Metro):**
```bash
cd apps/mobile-new
npm start
```

**Android Studio:**
- Run the app normally

### Development vs Production Builds

- **Debug builds**: Faster, includes debugging tools
- **Release builds**: Optimized for production

To build release:
```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

## 📋 Project Structure

```
android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/          # Java/Kotlin source
│   │   │   ├── res/           # Resources (layouts, values)
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle       # App-level Gradle config
├── build.gradle               # Project-level Gradle config
├── settings.gradle
└── gradle.properties
```

## 🐛 Troubleshooting

### Gradle Sync Failed

1. **Invalidate Caches:**
   - File > Invalidate Caches > Invalidate and Restart

2. **Check Gradle Version:**
   - File > Project Structure > Project > Gradle Version

3. **Update Gradle Wrapper:**
   ```bash
   cd android
   ./gradlew wrapper --gradle-version 8.0
   ```

### Build Errors

1. **Clean Build:**
   ```bash
   cd android
   ./gradlew clean
   ```

2. **Check SDK Versions:**
   - File > Project Structure > SDK Location
   - Ensure Android SDK is installed

### App Crashes on Launch

1. **Check Logcat** in Android Studio
2. **Ensure Metro Bundler is running:**
   ```bash
   npm start
   ```
3. **Check API URL** in `src/config/api.ts`

## 🚀 Building for Production

### Create Signed APK

1. **Build > Generate Signed Bundle / APK**
2. Create keystore (or use existing)
3. Select build variant: **release**
4. Click **Finish**

### Or Use Command Line

```bash
cd android
./gradlew assembleRelease
```

Sign the APK manually or configure signing in `android/app/build.gradle`.

## 📱 Testing on Device

### Via USB

1. Enable **Developer Options** on Android device
2. Enable **USB Debugging**
3. Connect device via USB
4. Run from Android Studio

### Via Network ADB

1. Connect device to same WiFi
2. Connect via USB first, then:
   ```bash
   adb tcpip 5555
   adb connect <device-ip>:5555
   ```
3. Disconnect USB, device will connect over WiFi

## 💡 Tips

- Use **Logcat** in Android Studio to see app logs
- Use **Layout Inspector** to debug UI
- Use **Profiler** to monitor performance
- Keep Metro bundler running while developing

## 🔄 Switching Back to Expo Go

If you want to test with Expo Go instead:

1. Close Android Studio
2. Delete `android/` folder
3. Run: `npm start`
4. Scan QR code with Expo Go app

## 📚 Resources

- [Android Studio Documentation](https://developer.android.com/studio)
- [Expo Prebuild Guide](https://docs.expo.dev/workflow/prebuild/)
- [React Native Android Setup](https://reactnative.dev/docs/environment-setup)

---

**Happy Coding!** 🚀

