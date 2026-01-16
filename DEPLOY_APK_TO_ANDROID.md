# Deploy APK to Android Device/Emulator

This guide shows how to build and deploy the APK to an Android device or emulator.

## Step 1: Build the APK

### Option A: Using Expo CLI (Recommended)

```powershell
cd apps\mobile

# Set NODE_ENV
$env:NODE_ENV = "production"

# Build APK
npx expo run:android --variant release
```

This will:
- Build the APK
- Automatically install it on a connected device/emulator
- Start the app

### Option B: Using Build Script

```powershell
cd apps\mobile
.\build-local-apk.ps1
```

Select option 2 (Release) when prompted.

### Option C: Using Gradle Directly

```powershell
cd apps\mobile
$env:NODE_ENV = "production"
cd android
.\gradlew assembleRelease
```

## Step 2: Find the APK

After building, the APK will be at:
```
apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

## Step 3: Deploy to Android Device/Emulator

### Method 1: Using ADB (Command Line)

1. **Check connected devices:**
   ```powershell
   adb devices
   ```
   You should see your device/emulator listed.

2. **Install the APK:**
   ```powershell
   cd apps\mobile\android\app\build\outputs\apk\release
   adb install app-release.apk
   ```

3. **For existing installations, use -r flag:**
   ```powershell
   adb install -r app-release.apk
   ```

4. **Launch the app:**
   ```powershell
   adb shell am start -n com.agentic.commerce/.MainActivity
   ```

### Method 2: Using Android Studio

1. **Open Android Studio**

2. **Open the project:**
   - File → Open
   - Navigate to `apps\mobile\android`
   - Click OK

3. **Connect device/emulator:**
   - Connect via USB (enable USB debugging)
   - Or start an emulator (Tools → Device Manager)

4. **Run the app:**
   - Click the Run button (green play icon)
   - Or press Shift+F10
   - Select your device/emulator
   - Click OK

   This will build and install automatically.

5. **Or install existing APK:**
   - Tools → Device Manager
   - Right-click your device/emulator
   - Select "Install APK..."
   - Browse to: `apps\mobile\android\app\build\outputs\apk\release\app-release.apk`
   - Click OK

### Method 3: Drag and Drop (Emulator Only)

1. **Start Android Emulator** (via Android Studio Device Manager)

2. **Drag the APK file** (`app-release.apk`) onto the emulator window

3. **Follow the installation prompts**

## Quick Deploy Script

I've created `deploy-apk.ps1` script that does everything automatically.

## Troubleshooting

### No devices found
```powershell
# Check if adb is running
adb devices

# If empty, check:
# 1. USB debugging enabled on device
# 2. Device drivers installed
# 3. Emulator is running
```

### Installation failed
- Make sure device/emulator is connected: `adb devices`
- Uninstall existing app first: `adb uninstall com.agentic.commerce`
- Try installing again: `adb install -r app-release.apk`

### Permission denied
- Enable USB debugging on your device
- Accept the USB debugging authorization dialog on your device

## Verifying Installation

After installation, verify the app is installed:
```powershell
adb shell pm list packages | Select-String "agentic"
```

You should see: `package:com.agentic.commerce`

