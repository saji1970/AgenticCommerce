# Quick Start: Deploy in Android Studio

## 🚀 Fast Track (5 Steps)

### 1. Setup (One-time)
```bash
# Run the setup script
cd apps/mobile/android
setup-android-studio.bat
```

### 2. Open in Android Studio
- Launch **Android Studio**
- **File > Open** → Select `C:\AgenticCommerce\apps\mobile\android`
- Wait for Gradle sync (5-10 min first time)

### 3. Connect Device
- **Physical Device**: Enable USB debugging, connect via USB
- **OR Emulator**: Tools > Device Manager > Create Device > Start

### 4. Run
- Select device from dropdown (top toolbar)
- Click **Run** button (▶️) or press **Shift + F10**

### 5. Done! 🎉
- App installs and launches automatically
- Check Logcat tab for any errors

---

## ⚡ Quick Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| SDK not found | Run `setup-android-studio.bat` |
| Gradle sync fails | Check Build tab, install missing SDKs |
| Device not detected | Enable USB debugging, check cable |
| Build slow | Normal on first build (10-15 min) |

---

## 📱 Alternative: Command Line Build

```bash
cd apps/mobile/android
gradlew.bat clean
gradlew.bat assembleDebug
# APK at: app/build/outputs/apk/debug/app-debug.apk
```

---

## 📖 Full Guide

See `ANDROID_STUDIO_DEPLOYMENT.md` for detailed instructions.

