# Build Local APK on Windows

Since EAS local builds require Linux/macOS, here are alternative ways to build locally on Windows:

## Option 1: Build with Gradle (Recommended for Local Windows Builds)

This bypasses EAS and builds directly with Android Studio tools:

### Prerequisites
- Android SDK installed (you have this at `C:\Users\saji\AppData\Local\Android\Sdk`)
- Java JDK installed (you have OpenJDK 17)
- Android Studio or Android Build Tools

### Steps

1. **Generate native Android project**:
   ```bash
   cd apps/mandate-app
   npx expo prebuild --platform android
   ```

2. **Build APK with Gradle**:
   ```bash
   cd android
   .\gradlew assembleRelease
   ```

   Or for debug APK:
   ```bash
   .\gradlew assembleDebug
   ```

3. **Find the APK**:
   - Release: `android/app/build/outputs/apk/release/app-release.apk`
   - Debug: `android/app/build/outputs/apk/debug/app-debug.apk`

## Option 2: Use Expo Development Build (Works on Windows)

Build a development APK that works with `expo start --dev-client`:

```bash
cd apps/mandate-app
npx expo prebuild --platform android
npx expo run:android --variant release
```

This creates an APK and installs it on your connected device/emulator.

## Option 3: Install WSL for EAS Local Builds

If you want to use EAS local builds:

1. **Install WSL 2**:
   ```powershell
   wsl --install
   ```

2. **After restart, open WSL and install dependencies**:
   ```bash
   # In WSL terminal
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   npm install -g pnpm eas-cli
   ```

3. **Navigate and build**:
   ```bash
   cd /mnt/c/AgenticCommerce/apps/mandate-app
   pnpm install
   eas build --platform android --local --profile preview
   ```

## Quick Script for Gradle Build

I can create a PowerShell script to automate the Gradle build process.
