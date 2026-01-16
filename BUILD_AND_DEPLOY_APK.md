# Build and Deploy APK to Android

## Quick Start

### Method 1: Using Expo CLI (Recommended - Builds and Installs Automatically)

This is the easiest method - it builds and installs automatically:

```powershell
# Navigate to mobile app directory
cd apps\mobile

# Set NODE_ENV
$env:NODE_ENV = "production"

# Build and deploy
npx expo run:android --variant release
```

This will:
- ✅ Build the APK
- ✅ Install it on connected device/emulator
- ✅ Launch the app automatically

### Method 2: Build APK, Then Install Manually

If you want to build first, then install separately:

**Step 1: Build the APK**

```powershell
cd apps\mobile
$env:NODE_ENV = "production"
.\build-local-apk.ps1
```

Select option 2 (Release) when prompted.

**Step 2: Install on Device/Emulator**

After build completes, the APK will be at:
```
apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

**Option A: Using ADB (Command Line)**

```powershell
# Check connected devices
adb devices

# Install APK
cd apps\mobile\android\app\build\outputs\apk\release
adb install -r app-release.apk

# Launch app
adb shell am start -n com.agentic.commerce/.MainActivity
```

**Option B: Using Android Studio**

1. Open Android Studio
2. File → Open → Navigate to `apps\mobile\android`
3. Click Run button (green play icon) or press Shift+F10
4. Select your device/emulator
5. Click OK

**Option C: Drag and Drop (Emulator Only)**

1. Start Android Emulator
2. Drag `app-release.apk` onto the emulator window
3. Follow installation prompts

## Prerequisites

Before building, ensure:

1. **Java JDK 17 or 21** is installed
2. **Android SDK** is installed (via Android Studio)
3. **ANDROID_HOME** environment variable is set
4. **Device/Emulator** is connected:
   ```powershell
   adb devices
   ```

## Troubleshooting

### No devices found
- Enable USB debugging on physical device
- Start Android emulator (Android Studio → Device Manager)
- Check: `adb devices`

### Build fails
- Make sure you're in `apps\mobile` directory
- Set `NODE_ENV=production` before building
- Check Java and Android SDK are installed

### Installation fails
- Uninstall existing app: `adb uninstall com.agentic.commerce`
- Try again: `adb install -r app-release.apk`

## Quick Reference

**Build command:**
```powershell
cd apps\mobile
$env:NODE_ENV = "production"
npx expo run:android --variant release
```

**APK location:**
```
apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

**Install command:**
```powershell
adb install -r apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

**Launch command:**
```powershell
adb shell am start -n com.agentic.commerce/.MainActivity
```

