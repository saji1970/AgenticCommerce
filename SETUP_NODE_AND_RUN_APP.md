# Complete Setup Guide: Node.js 20 and Mobile App

## Current Status

✅ **Completed:**
- Android emulator running (Pixel_7a - emulator-5554)
- APK successfully built and installed (`com.agentic.commerce`)
- nvm-windows installed
- Metro and Expo dependencies updated
- Android build configuration fixed (Kotlin compatibility resolved)

⚠️ **Pending:**
- Node.js 20 installation (nvm-windows requires terminal restart)
- Metro bundler start
- App launch with live reload

---

## The Problem

Node.js v24 is incompatible with Metro bundler. We installed nvm-windows to manage Node.js versions, but **Windows requires a terminal restart** for PATH changes to take effect.

---

## Solution: Complete These Steps

### Step 1: Restart Your Terminal
**IMPORTANT:** Close this terminal completely and open a new Command Prompt or PowerShell as Administrator.

### Step 2: Install and Use Node.js 20

Open **Command Prompt** or **PowerShell** and run:

```cmd
# List installed Node versions
nvm list

# Install Node.js 20 LTS
nvm install 20

# Switch to Node.js 20
nvm use 20

# Verify installation
node --version
npm --version
```

Expected output: `v20.x.x`

### Step 3: Start Metro Bundler

In your terminal, navigate to the project and start Expo:

```cmd
cd C:\AgenticCommerce\apps\mobile

# Clear cache and start
npx expo start --clear --android
```

### Step 4: App Will Launch Automatically

Once Metro is running, the app on the emulator will automatically connect and load.

---

## Alternative: Quick Test Without Metro

If you want to test the backend API instead:

```cmd
cd C:\AgenticCommerce\apps\backend
pnpm run dev
```

Then test the APIs:
```cmd
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ap2/gateway/health
```

---

## Troubleshooting

### If nvm is not recognized:
1. Make sure you restarted your terminal completely
2. Check PATH: `echo %PATH%` should include `C:\Users\<username>\AppData\Roaming\nvm`
3. Reinstall nvm-windows if needed: `winget install CoreyButler.NVMforWindows`

### If Metro still fails with Node 20:
```cmd
cd C:\AgenticCommerce\apps\mobile
pnpm install
npx expo start --clear
```

### If app doesn't connect to Metro:
```cmd
# Setup reverse proxy
adb reverse tcp:8081 tcp:8081

# Restart app
adb shell am force-stop com.agentic.commerce
adb shell am start -n com.agentic.commerce/.MainActivity
```

---

## What's Been Built

### ✅ Android APK
- Location: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
- Package: `com.agentic.commerce`
- Installed on emulator: Pixel_7a (emulator-5554)

### ✅ Backend APIs
- Complete AP2 payment gateway
- Mandate system with full UI
- Admin dashboard APIs
- Demo data generator

### ✅ Build Issues Resolved
- Kotlin version compatibility (forced to 1.9.25)
- Compose Compiler suppression added
- Deprecated Expo properties removed
- Gradle dependencies updated

---

## Next Steps After Terminal Restart

1. **Open NEW terminal** (Command Prompt as Admin)
2. Run: `nvm install 20 && nvm use 20`
3. Run: `cd C:\AgenticCommerce\apps\mobile && npx expo start --android`
4. Watch the emulator - app will load automatically

---

## Files Created

- `C:\AgenticCommerce\setup-node.ps1` - PowerShell setup script (optional)
- `C:\AgenticCommerce\install-node20.bat` - Batch setup script (optional)
- This guide: `C:\AgenticCommerce\SETUP_NODE_AND_RUN_APP.md`

---

**The hard part is done - just need to restart terminal for NODE environment!** 🚀
