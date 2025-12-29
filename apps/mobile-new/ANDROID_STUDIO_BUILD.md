# Android Studio Build & Deploy Guide

## 📱 Quick Start - Build & Deploy

### Option 1: Using Batch Scripts (Easiest)

**Build APK:**
- Double-click: `build-android-studio.bat`
- APK will be at: `android\app\build\outputs\apk\debug\app-debug.apk`

**Build & Deploy:**
- Double-click: `deploy-android-studio.bat`
- This builds APK and installs on connected device automatically

### Option 2: Using Android Studio (Recommended)

#### Step 1: Open Project in Android Studio

1. Launch **Android Studio**
2. Click **"Open"** (or **File > Open**)
3. Navigate to: `C:\AgenticCommerce\apps\mobile-new\android`
4. Select the `android` folder
5. Click **OK**

#### Step 2: Wait for Gradle Sync

- Android Studio will automatically sync Gradle
- Wait for "Gradle sync finished" (5-10 minutes first time)
- If sync fails, click "Sync Project with Gradle Files" button

#### Step 3: Connect Android Device

**Enable Developer Options:**
1. Go to Settings > About Phone
2. Tap "Build Number" 7 times
3. Go back > Developer Options
4. Enable "USB Debugging"

**Connect Device:**
1. Connect Android device via USB
2. Accept USB debugging prompt on device
3. In Android Studio, your device should appear in device selector

#### Step 4: Build & Run

**Method 1: Run Button**
1. Click the **Run** button (green play icon) in toolbar
2. Select your device
3. Click **OK**
4. App will build and install automatically

**Method 2: Build APK Only**
1. **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Wait for build to complete
3. Click "locate" in notification to find APK
4. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Step 5: Install APK Manually (if needed)

```bash
cd android
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 🔧 Build Commands (Command Line)

### Build Debug APK

```bash
cd apps/mobile-new/android
./gradlew assembleDebug
```

**APK Location:** `android/app/build/outputs/apk/debug/app-debug.apk`

### Build Release APK

```bash
cd apps/mobile-new/android
./gradlew assembleRelease
```

**APK Location:** `android/app/build/outputs/apk/release/app-release.apk`

### Install on Device

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Install with Replace

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## ⚙️ Configuration

### API URL

The app is configured to use Railway backend:
- URL: `https://agenticcommerce-production.up.railway.app/api/v1`
- Configuration: `src/config/api.ts`

### App Details

Configured in `app.json`:
- Package: `com.sajipillai70.agenticcommerce`
- Version: `1.0.0`
- Build Number: `1.0.0` (iOS), `1` (Android)

## 🐛 Troubleshooting

### Gradle Sync Failed

1. **Invalidate Caches:**
   - File > Invalidate Caches > Invalidate and Restart

2. **Update Gradle:**
   - File > Project Structure > Project > Gradle Version
   - Use Gradle 8.0+

3. **Clean Build:**
   ```bash
   cd android
   ./gradlew clean
   ```

### Build Errors

**Error: SDK not found**
- File > Project Structure > SDK Location
- Set Android SDK path

**Error: NDK not found**
- Usually not needed, can be ignored
- Or install NDK from SDK Manager

**Error: Build tools not found**
- Tools > SDK Manager
- SDK Tools tab > Install Android SDK Build-Tools

### Device Not Detected

1. **Check ADB:**
   ```bash
   adb devices
   ```
   Should show your device

2. **Restart ADB:**
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

3. **Enable USB Debugging:**
   - Settings > Developer Options > USB Debugging

### App Crashes on Launch

1. **Check Logcat in Android Studio:**
   - View > Tool Windows > Logcat
   - Look for error messages (red text)

2. **Check API URL:**
   - Verify Railway backend is accessible
   - Check `src/config/api.ts` has correct URL

3. **Check Permissions:**
   - Verify app permissions in `app.json`
   - Check AndroidManifest.xml

## 📱 Testing

### Run from Android Studio

1. Click **Run** button
2. Select device
3. App installs and launches automatically

### Manual Install

1. Build APK (see above)
2. Transfer APK to device
3. Enable "Install from unknown sources"
4. Tap APK to install

### Debugging

**View Logs:**
- Android Studio > Logcat window
- Filter by package: `com.sajipillai70.agenticcommerce`

**Debug Breakpoints:**
- Set breakpoints in Java/Kotlin code
- Run in debug mode (bug icon instead of play icon)

**React Native Debugging:**
- Shake device > "Debug"
- Opens Chrome DevTools

## 🚀 Release Build

### Create Signed APK

1. **Build > Generate Signed Bundle / APK**
2. Create keystore (first time) or select existing
3. Fill in keystore details
4. Select build variant: **release**
5. Click **Finish**

**APK Location:** `android/app/release/app-release.apk`

### Or Use Command Line

```bash
cd android
./gradlew assembleRelease
```

**Note:** Release builds need to be signed. Configure signing in `android/app/build.gradle`.

## 📋 Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/sajipillai70/agenticcommerce/
│   │   │   ├── MainActivity.kt
│   │   │   └── MainApplication.kt
│   │   ├── AndroidManifest.xml
│   │   └── res/           # Resources
│   └── build.gradle       # App-level config
├── build.gradle           # Project-level config
├── settings.gradle
└── gradle.properties
```

## ✅ Checklist

- [ ] Android Studio installed
- [ ] Android SDK installed
- [ ] Android device connected (or emulator running)
- [ ] USB Debugging enabled
- [ ] Gradle sync completed
- [ ] Build successful
- [ ] App installed on device
- [ ] App launches without crashes

## 🎯 Next Steps

1. ✅ Build debug APK
2. ✅ Test on device
3. ✅ Verify API connection (check Railway backend)
4. ✅ Fix any crashes (check Logcat)
5. ✅ Create release build for distribution

---

**Ready to build?** Open `android` folder in Android Studio! 🚀


