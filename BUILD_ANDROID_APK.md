# Building Android APK for AgenticCommerce

This guide provides two methods to build an APK for your Expo app and deploy it in Android Studio.

## Prerequisites

1. Node.js 20+ installed (already set up based on your setup files)
2. Android Studio installed with Android SDK
3. Java Development Kit (JDK) 17 or later
4. Set up environment variables:
   - `ANDROID_HOME` pointing to your Android SDK location
   - Add `%ANDROID_HOME%\platform-tools` to PATH
   - Add `%ANDROID_HOME%\tools` to PATH

## Method 1: Build APK Using EAS Build (Recommended - Cloud-based)

This method builds your APK in the cloud without needing Android Studio initially.

### Steps:

1. **Install EAS CLI globally:**
   ```bash
   npm install -g eas-cli
   ```

2. **Navigate to mobile app directory:**
   ```bash
   cd apps\mobile
   ```

3. **Login to Expo:**
   ```bash
   eas login
   ```
   Create a free account at https://expo.dev if you don't have one.

4. **Configure your project:**
   ```bash
   eas build:configure
   ```

5. **Build APK for development:**
   ```bash
   eas build --platform android --profile development
   ```

   Or for production:
   ```bash
   eas build --platform android --profile production
   ```

6. **Download the APK:**
   - Once the build completes, EAS will provide a download link
   - Download the APK file
   - Install it on your Android device or emulator

### Advantages:
- No local Android setup required
- Faster builds on EAS servers
- Automatic version management
- Easy to share builds with team

## Method 2: Local Android Build with Android Studio

This method generates native Android code that you can open in Android Studio.

### Steps:

1. **Navigate to mobile app directory:**
   ```bash
   cd apps\mobile
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Prebuild Android project:**
   ```bash
   npx expo prebuild --platform android
   ```

   This creates an `android` folder with native Android code.

4. **Open in Android Studio:**
   - Launch Android Studio
   - Click "Open an Existing Project"
   - Navigate to `C:\AgenticCommerce\apps\mobile\android`
   - Click "OK"

5. **Sync and Build in Android Studio:**
   - Wait for Gradle sync to complete
   - Click "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)"
   - Wait for the build to complete
   - Android Studio will show a notification with "locate" link to find the APK

6. **APK Location:**
   The APK will be located at:
   ```
   apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
   ```
   Or for release:
   ```
   apps\mobile\android\app\build\outputs\apk\release\app-release.apk
   ```

### Alternative - Build from Command Line:

After step 3 above, you can also build from command line:

```bash
cd android
.\gradlew assembleDebug
```

Or for release build:
```bash
.\gradlew assembleRelease
```

## Method 3: Quick Development Build (Fastest for Testing)

For quick testing during development:

1. **Start Metro bundler:**
   ```bash
   cd apps\mobile
   pnpm start
   ```

2. **In another terminal, run on Android:**
   ```bash
   cd apps\mobile
   pnpm android
   ```

   This will:
   - Build the app
   - Install it on connected device/emulator
   - Start the app automatically

## Installing APK on Device

### Using Android Studio:
1. Connect your Android device via USB (enable USB debugging)
2. Or use an Android Virtual Device (AVD) from Android Studio
3. Drag and drop the APK onto the emulator
4. Or use: `adb install path\to\app-debug.apk`

### Using Command Line:
```bash
adb install apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

## Troubleshooting

### "ANDROID_HOME not set"
Set environment variable:
```
ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
```

### "SDK location not found"
Create `local.properties` in `apps\mobile\android\`:
```
sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### Gradle build fails
1. Make sure you have JDK 17 installed
2. Check that `JAVA_HOME` is set correctly
3. In Android Studio: File > Invalidate Caches > Invalidate and Restart

### Metro bundler errors
```bash
cd apps\mobile
npx expo start --clear
```

## Production Release Build

For production release (requires signing):

1. **Generate upload keystore:**
   ```bash
   cd apps\mobile\android\app
   keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure signing in `android/app/build.gradle`**
   (See Android documentation for details)

3. **Build release APK:**
   ```bash
   cd android
   .\gradlew assembleRelease
   ```

## Backend Configuration

Don't forget to update the API endpoint in your app to point to your backend:
- Development: Usually `http://10.0.2.2:3000` for Android emulator
- Production: Your actual server URL

Update the API base URL in your mobile app configuration files.

## Next Steps

After building and installing:
1. Test all features on the device
2. Check network connectivity to your backend
3. Verify authentication and data persistence
4. Test on different Android versions if possible

## Useful Commands

```bash
# Check connected devices
adb devices

# View app logs
adb logcat | grep -i "ReactNativeJS"

# Uninstall app
adb uninstall com.agentic.commerce

# Clear Metro cache
npx expo start --clear

# Check Expo doctor for issues
npx expo-doctor
```
