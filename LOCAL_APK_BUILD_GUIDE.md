# Local APK Build Guide

This guide explains how to build APK files locally on your machine instead of using EAS Cloud Build.

## Prerequisites

Before building locally, ensure you have:

1. **Java Development Kit (JDK) 17 or 21**
   - Check: `java -version`
   - Download: [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://adoptium.net/)

2. **Android SDK** (via Android Studio)
   - Install Android Studio: https://developer.android.com/studio
   - Install Android SDK Platform 34 (or the version specified in your build.gradle)
   - Set `ANDROID_HOME` environment variable

3. **Node.js 20+ and pnpm** (already installed)

4. **Set up environment variables** (Windows):
   ```powershell
   # Add to your system environment variables or PowerShell profile
   $env:ANDROID_HOME = "C:\Users\YourUsername\AppData\Local\Android\Sdk"
   $env:JAVA_HOME = "C:\Program Files\Java\jdk-17"  # Adjust path
   ```

## Method 1: Using Expo CLI (Recommended)

This method uses Expo CLI which handles all the directory setup correctly.

### Steps:

1. **Navigate to the mobile app directory:**
   ```powershell
   cd apps/mobile
   ```

2. **Set NODE_ENV and build:**
   ```powershell
   $env:NODE_ENV = "production"
   npx expo run:android --variant release
   ```

3. **Find your APK:**
   The APK will be located at:
   ```
   apps/mobile/android/app/build/outputs/apk/release/app-release.apk
   ```

This method automatically:
- Sets the correct working directory
- Configures Metro bundler correctly
- Handles all dependency resolution
- Builds and optionally installs the APK

## Method 2: Using Gradle Directly

This method builds the APK using Gradle directly (requires NODE_ENV to be set).

### Steps:

1. **Navigate to the mobile app directory:**
   ```powershell
   cd apps/mobile
   ```

2. **Set NODE_ENV (IMPORTANT for Metro bundler):**
   ```powershell
   $env:NODE_ENV = "production"
   ```

3. **Build the APK using Gradle:**
   ```powershell
   cd android
   .\gradlew assembleRelease
   ```

4. **Find your APK:**
   The APK will be located at:
   ```
   apps/mobile/android/app/build/outputs/apk/release/app-release.apk
   ```

⚠️ **Important:** You MUST set `NODE_ENV=production` before running Gradle, otherwise Metro bundler will fail to resolve `index.js` from the correct directory.

### Build Script

You can use the provided `build-local-apk.ps1` script (see below) to automate this process.

## Method 2: Using Expo Run (Builds and Installs)

This method builds and installs the app on a connected device/emulator.

### Steps:

1. **Ensure Android device/emulator is connected:**
   ```powershell
   adb devices
   ```

2. **Build and install:**
   ```powershell
   cd apps/mobile
   npx expo run:android --variant release
   ```

This will:
- Build the JavaScript bundle
- Compile native code
- Build the APK
- Install on connected device/emulator

The APK will be in the same location as Method 1.

## Method 3: EAS Build Local (If EAS CLI is installed)

This uses EAS Build but runs it locally on your machine.

### Prerequisites:
- Install EAS CLI: `npm install -g eas-cli`
- Docker Desktop (required for local builds)

### Steps:

1. **Build locally:**
   ```powershell
   cd apps/mobile
   eas build --platform android --profile preview --local
   ```

This method uses Docker to create an isolated build environment.

## Build Variants

### Debug APK (Development)
```powershell
cd apps/mobile/android
.\gradlew assembleDebug
```
Output: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (Production)
```powershell
cd apps/mobile/android
.\gradlew assembleRelease
```
Output: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

### Bundle APK (Smaller size, requires Android App Bundle)
```powershell
cd apps/mobile/android
.\gradlew bundleRelease
```
Output: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`

## Troubleshooting

### Error: "ANDROID_HOME not set"
- Set the `ANDROID_HOME` environment variable to your Android SDK path
- Usually: `C:\Users\YourUsername\AppData\Local\Android\Sdk`

### Error: "Java version not compatible"
- Ensure you have JDK 17 or 21 installed
- Set `JAVA_HOME` environment variable

### Error: "SDK platform not found"
- Open Android Studio
- Go to Tools > SDK Manager
- Install the required Android SDK Platform (usually 34)
- Install Android SDK Build-Tools

### Error: "Gradle build failed"
- Clean the build: `.\gradlew clean`
- Rebuild: `.\gradlew assembleRelease`
- Check the error logs in the terminal

### Error: "Metro bundler issues"
- Make sure you've run `npx expo export` first
- Or use `npx expo run:android` which handles bundling automatically

## Signing the APK (For Production)

For production releases, you need to sign the APK:

1. **Generate a keystore** (if you don't have one):
   ```powershell
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure signing in `android/app/build.gradle`:**
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('my-release-key.keystore')
               storePassword 'your-store-password'
               keyAlias 'my-key-alias'
               keyPassword 'your-key-password'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
           }
       }
   }
   ```

3. **Build signed APK:**
   ```powershell
   .\gradlew assembleRelease
   ```

⚠️ **Important:** Never commit your keystore or passwords to version control!

## Quick Build Scripts

See `build-local-apk.ps1` and `build-local-apk.bat` for automated build scripts.

