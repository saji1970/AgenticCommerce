# Deploy to Android Emulator - Quick Guide

This guide will help you deploy the AgenticCommerce app to an Android emulator.

## Prerequisites

1. **Android Studio installed** with Android SDK
2. **At least one Android Virtual Device (AVD) created**
3. **Environment variable** `ANDROID_HOME` set to your Android SDK location

## Method 1: Automated Script (Easiest)

### Using PowerShell Script:
```powershell
.\deploy-to-emulator.ps1
```

This script will:
- Check your Android SDK setup
- List available emulators
- Start an emulator if needed
- Wait for it to boot
- Deploy the app automatically

### Using Batch File:
```cmd
deploy-to-emulator.bat
```

Simpler version that requires you to manually start the emulator first.

## Method 2: Manual Steps

### Step 1: Create an Android Virtual Device (if you don't have one)

1. Open Android Studio
2. Click **Tools** > **Device Manager** (or **AVD Manager**)
3. Click **Create Device**
4. Select a device definition (e.g., Pixel 5)
5. Select a system image (e.g., Android 13 / API 33) - download if needed
6. Click **Finish**

### Step 2: Start the Emulator

**Option A: From Android Studio**
1. Open Device Manager
2. Click the Play ▶ button next to your emulator
3. Wait for it to fully boot (30-60 seconds)

**Option B: From Command Line**
```cmd
%ANDROID_HOME%\emulator\emulator.exe -avd <emulator_name>
```

To see available emulator names:
```cmd
%ANDROID_HOME%\emulator\emulator.exe -list-avds
```

### Step 3: Verify Emulator is Running

```bash
adb devices
```

You should see something like:
```
List of devices attached
emulator-5554   device
```

### Step 4: Deploy the App

```bash
cd apps\mobile
pnpm install
pnpm android
```

This will:
- Install dependencies (if not already done)
- Build the native Android app
- Install it on the emulator
- Start the Metro bundler
- Launch the app

## What Happens During First Deployment

The first time you run `pnpm android`:

1. **Prebuild** (1-2 minutes): Expo generates native Android code
2. **Gradle Build** (3-5 minutes): Compiles the Android app
3. **Install** (30 seconds): Installs APK on emulator
4. **Metro Start**: JavaScript bundler starts
5. **App Launch**: App opens on emulator

Subsequent deployments are much faster!

## During Development

### Running the app after initial deployment:

1. **Start Metro bundler:**
   ```bash
   cd apps\mobile
   pnpm start
   ```

2. **In another terminal, deploy:**
   ```bash
   cd apps\mobile
   pnpm android
   ```

Or just press `a` in the Metro bundler terminal to deploy to Android.

### Hot Reload

Once the app is running:
- Save changes to your code
- The app will automatically reload
- For deeper changes, shake the emulator (Ctrl + M) and select "Reload"

## Troubleshooting

### "No connected devices found"
- Make sure the emulator is fully booted
- Run `adb devices` to verify
- Try `adb kill-server && adb start-server`

### "ANDROID_HOME is not set"
Set the environment variable:
```cmd
setx ANDROID_HOME "C:\Users\YourUsername\AppData\Local\Android\Sdk"
```
Then restart your terminal.

### Emulator is slow
- Ensure "Intel HAXM" or "AMD Hypervisor" is installed
- In AVD settings, increase RAM allocation (4GB+ recommended)
- Enable hardware acceleration

### Build fails with Gradle errors
```bash
cd apps\mobile\android
.\gradlew clean
cd ..\..
pnpm android
```

### Metro bundler issues
```bash
cd apps\mobile
npx expo start --clear
```

Then press `a` to deploy to Android.

### Port 8081 already in use
Kill the existing Metro process:
```bash
npx kill-port 8081
```

Or find and kill the process:
```cmd
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### App crashes immediately
Check logs:
```bash
adb logcat | grep -i "ReactNativeJS"
```

Or in Android Studio: **Logcat** tab at the bottom.

## Useful Commands

```bash
# List running emulators
adb devices

# Install APK manually
adb install path\to\app.apk

# Uninstall app
adb uninstall com.agentic.commerce

# Clear app data
adb shell pm clear com.agentic.commerce

# View logs
adb logcat

# Restart adb
adb kill-server && adb start-server

# Take screenshot
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png

# Open dev menu in app
adb shell input keyevent 82
```

## Performance Tips

1. **Use a recent emulator image** (Android 11+)
2. **Allocate enough resources** (4GB RAM, 4 CPU cores)
3. **Keep emulator running** between deployments
4. **Use Fast Refresh** instead of full reload when possible
5. **Consider using a physical device** for better performance

## Next Steps

After successful deployment:
1. Test all app features
2. Check network connectivity to backend
3. Test authentication flow
4. Verify data persistence
5. Check error handling

## Backend Connection

For the emulator to connect to your local backend:
- Use `http://10.0.2.2:3000` instead of `localhost:3000`
- `10.0.2.2` is the special IP that maps to your host machine's localhost

Update your API configuration in the mobile app accordingly.

## Getting Help

If you encounter issues:
1. Check the logs with `adb logcat`
2. Run `npx expo-doctor` to diagnose common problems
3. Check Android Studio's Logcat for detailed error messages
4. Ensure all prerequisites are properly installed
