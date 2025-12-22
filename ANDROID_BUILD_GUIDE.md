# Android App Build Guide - Agentic Commerce

## Prerequisites

1. **Android Studio** installed (Download from: https://developer.android.com/studio)
2. **Java JDK 17** (comes with Android Studio)
3. **Android SDK** (comes with Android Studio)
4. **Node.js and npm** (already installed)

## Project Structure

The Android native project has been generated at:
```
C:\AgenticCommerce\apps\mobile\android\
```

## Method 1: Build and Run Using Android Studio (Recommended)

### Step 1: Open Project in Android Studio

1. Launch **Android Studio**
2. Click on **"Open"** from the welcome screen (or **File > Open** if Android Studio is already running)
3. Navigate to: `C:\AgenticCommerce\apps\mobile\android`
4. Select the `android` folder and click **OK**
5. Wait for Gradle sync to complete (this may take 5-10 minutes the first time)

### Step 2: Configure Android Device/Emulator

**Option A: Use Physical Device (Recommended)**
1. Enable Developer Options on your Android phone:
   - Go to **Settings > About Phone**
   - Tap **Build Number** 7 times until you see "You are now a developer!"
2. Enable USB Debugging:
   - Go to **Settings > Developer Options**
   - Enable **USB Debugging**
3. Connect your phone to your computer via USB
4. Accept the USB debugging prompt on your phone

**Option B: Use Android Emulator**
1. In Android Studio, click on **Tools > Device Manager**
2. Click **Create Device**
3. Select a phone model (e.g., Pixel 7)
4. Select a system image (recommended: Android 13 or 14, API Level 33+)
5. Click **Finish**
6. Start the emulator from the Device Manager

### Step 3: Build and Run the App

1. Wait for Gradle sync to finish
2. Click the **Run** button (green play icon) in the toolbar
   - Or press **Shift + F10**
3. Select your device from the deployment target dialog
4. The app will be built and installed on your device

### Step 4: View the App

The "Agentic Commerce" app will launch automatically on your device!

---

## Method 2: Build APK Using Command Line

### Build Debug APK

```bash
cd C:\AgenticCommerce\apps\mobile\android
.\gradlew assembleDebug
```

The APK will be generated at:
```
C:\AgenticCommerce\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

### Build Release APK (Production)

```bash
cd C:\AgenticCommerce\apps\mobile\android
.\gradlew assembleRelease
```

The APK will be generated at:
```
C:\AgenticCommerce\apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

**Note**: For release builds, you need to sign the APK. See the "APK Signing" section below.

### Install APK on Device

```bash
# Install debug APK
adb install C:\AgenticCommerce\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk

# Or install release APK
adb install C:\AgenticCommerce\apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

---

## Method 3: Run Using Expo CLI (Development Mode)

This method automatically handles the build and runs the app:

```bash
cd C:\AgenticCommerce\apps\mobile
npx expo run:android
```

This will:
1. Build the app
2. Install it on connected device/emulator
3. Start the Metro bundler for hot reloading

---

## APK Signing for Release (Optional)

To distribute your app on Google Play Store or as a signed APK, you need to sign it.

### 1. Generate a Keystore

```bash
cd C:\AgenticCommerce\apps\mobile\android\app
keytool -genkeypair -v -storetype PKCS12 -keystore agentic-commerce-release.keystore -alias agentic-commerce -keyalg RSA -keysize 2048 -validity 10000
```

Follow the prompts to set a password and enter your details.

### 2. Configure Gradle for Signing

Edit `C:\AgenticCommerce\apps\mobile\android\app\build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('agentic-commerce-release.keystore')
            storePassword 'YOUR_KEYSTORE_PASSWORD'
            keyAlias 'agentic-commerce'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    buildTypes {
        release {
            ...
            signingConfig signingConfigs.release
        }
    }
}
```

**Important**: Never commit passwords to version control! Use environment variables or gradle.properties instead.

### 3. Build Signed Release APK

```bash
cd C:\AgenticCommerce\apps\mobile\android
.\gradlew assembleRelease
```

---

## Troubleshooting

### Gradle Sync Failed
**Solution**:
```bash
cd C:\AgenticCommerce\apps\mobile\android
.\gradlew clean
```
Then sync again in Android Studio.

### Build Failed - SDK Not Found
**Solution**:
1. Open Android Studio
2. Go to **File > Settings** (or **Preferences** on Mac)
3. Navigate to **Appearance & Behavior > System Settings > Android SDK**
4. Ensure Android SDK is installed (recommended: API Level 33+)

### App Crashes on Startup
**Solution**:
1. Check if backend server is running (the app needs the API)
2. Update API URL in the app configuration
3. Check Logcat in Android Studio for error messages

### No Device Found
**Solution**:
- For physical device: Make sure USB debugging is enabled and cable is connected
- For emulator: Make sure emulator is running
- Run `adb devices` to verify device is detected

### Build Takes Too Long
**Solution**:
- First build takes 10-15 minutes (normal)
- Subsequent builds are faster (2-3 minutes)
- Close unnecessary apps to free up RAM

---

## App Configuration

### Update API Base URL

Edit `C:\AgenticCommerce\apps\mobile\src\config\api.ts` (or environment file):

```typescript
export const API_BASE_URL = 'http://10.0.2.2:3000'; // For emulator
// export const API_BASE_URL = 'http://YOUR_COMPUTER_IP:3000'; // For physical device
```

**Note**: `10.0.2.2` is the special IP that Android emulator uses to access the host machine's localhost.

For physical devices, use your computer's actual IP address (e.g., `192.168.1.100:3000`).

---

## Running the Complete Stack

### 1. Start Backend Server

```bash
cd C:\AgenticCommerce\apps\backend
npm run dev
```

### 2. Ensure Database is Running

Make sure PostgreSQL is running with the database configured.

### 3. Run Android App

Use any of the methods above to run the Android app.

---

## Build Statistics

- **Debug APK Size**: ~50-70 MB
- **Release APK Size**: ~30-40 MB (after ProGuard/R8 optimization)
- **First Build Time**: 10-15 minutes
- **Incremental Build Time**: 2-3 minutes
- **Minimum Android Version**: Android 6.0 (API 23)
- **Target Android Version**: Android 14 (API 34)

---

## Next Steps

1. ✅ Build the app in Android Studio
2. ✅ Test on physical device or emulator
3. Configure backend URL for your network
4. Test AP2 mandate creation with biometric auth
5. Test payment flow with test cards
6. Customize app icons and branding
7. Build release APK for distribution

---

## Additional Resources

- **Expo Documentation**: https://docs.expo.dev/
- **React Native Documentation**: https://reactnative.dev/
- **Android Developer Guides**: https://developer.android.com/guide
- **Gradle Build Guide**: https://docs.gradle.org/current/userguide/userguide.html

---

**App Package**: `com.agenticcommerce.app`
**App Name**: Agentic Commerce
**Version**: 1.0.0
