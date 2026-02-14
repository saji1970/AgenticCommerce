# Quick Start: Build and Deploy APKs

## 🚀 Fastest Way to Build Both APKs

### Option 1: Unified Build Script (Recommended)

From the project root, run:

```powershell
.\build-both-apks.ps1
```

This will:
- ✅ Check all prerequisites
- ✅ Build Agentic Commerce App APK
- ✅ Build User Mandate App APK
- ✅ Show APK locations and sizes
- ✅ Optionally open APK folders

**Build variants:**
```powershell
# Release APK (production, optimized)
.\build-both-apks.ps1

# Debug APK (development, faster build)
.\build-both-apks.ps1 -Variant debug
```

### Option 2: Individual App Builds

**Agentic Commerce App:**
```powershell
cd apps\mobile
.\build-local-apk.ps1
```

**User Mandate App:**
```powershell
cd apps\mandate-app
.\build-local-apk.ps1
```

## 📱 Deploy in Android Studio

### Quick Deploy Script

```powershell
.\deploy-to-android-studio.ps1
```

This automatically:
- ✅ Finds Android Studio installation
- ✅ Opens both Android projects
- ✅ Shows next steps

### Manual Deploy Steps

1. **Open Android Studio**

2. **Open Agentic Commerce App:**
   - File → Open
   - Navigate to: `C:\AgenticCommerce\apps\mobile\android`
   - Click OK

3. **Open User Mandate App:**
   - File → Open (new window)
   - Navigate to: `C:\AgenticCommerce\apps\mandate-app\android`
   - Click OK

4. **Wait for Gradle Sync:**
   - Android Studio will automatically sync projects
   - Wait for "Gradle sync finished" message

5. **Connect Device or Start Emulator:**
   - Connect Android device via USB (enable USB debugging)
   - Or: Tools → Device Manager → Create/Start emulator

6. **Select Device:**
   - Click device dropdown (top toolbar)
   - Select your device/emulator

7. **Run App:**
   - Click green "Run" button (▶️)
   - Or press `Shift + F10`
   - Android Studio will build and install automatically

## 📦 APK Locations

After successful build:

**Agentic Commerce App:**
- Release: `apps\mobile\android\app\build\outputs\apk\release\app-release.apk`
- Debug: `apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk`

**User Mandate App:**
- Release: `apps\mandate-app\android\app\build\outputs\apk\release\app-release.apk`
- Debug: `apps\mandate-app\android\app\build\outputs\apk\debug\app-debug.apk`

## 🔧 Prerequisites Checklist

Before building, ensure you have:

- [ ] **Java JDK 17 or 21** installed
  - Verify: `java -version`
  
- [ ] **Android Studio** installed
  - Download: https://developer.android.com/studio
  
- [ ] **Android SDK** installed (via Android Studio)
  - SDK Platform: API 33 or higher
  - Build Tools: Latest version
  
- [ ] **ANDROID_HOME** environment variable set
  - Default: `C:\Users\<YourUsername>\AppData\Local\Android\Sdk`
  - Verify: `echo $env:ANDROID_HOME`
  
- [ ] **Node.js v20+** installed
  - Verify: `node --version`
  
- [ ] **pnpm v8+** installed
  - Install: `npm install -g pnpm`
  - Verify: `pnpm --version`

## 🐛 Common Issues & Fixes

### Issue: "ANDROID_HOME not set"

**Fix:**
```powershell
# Set for current session
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"

# Set permanently
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk", "User")
```

### Issue: "Java version mismatch"

**Fix:**
- Install JDK 17 or 21
- Set JAVA_HOME:
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
  ```

### Issue: "Gradle build failed"

**Fix:**
```powershell
cd android
.\gradlew clean
.\gradlew assembleRelease
```

### Issue: "Device not detected"

**Fix:**
1. Enable USB Debugging: Settings → Developer Options → USB Debugging
2. Install USB drivers for your device
3. Verify: `adb devices`

### Issue: "Project won't sync in Android Studio"

**Fix:**
1. File → Invalidate Caches → Invalidate and Restart
2. File → Sync Project with Gradle Files

## 📲 Install APK Directly (Without Android Studio)

If you just want to install the APK on a connected device:

```powershell
# Install Agentic Commerce App
adb install apps\mobile\android\app\build\outputs\apk\release\app-release.apk

# Install User Mandate App
adb install apps\mandate-app\android\app\build\outputs\apk\release\app-release.apk
```

**Note:** Requires `adb` in PATH (usually in `%ANDROID_HOME%\platform-tools`)

## 🎯 Build Commands Reference

### Using Gradle Directly

**Agentic Commerce App:**
```powershell
cd apps\mobile\android
.\gradlew assembleRelease    # Release APK
.\gradlew assembleDebug       # Debug APK
```

**User Mandate App:**
```powershell
cd apps\mandate-app\android
.\gradlew assembleRelease     # Release APK
.\gradlew assembleDebug      # Debug APK
```

### Clean Build

```powershell
cd android
.\gradlew clean
.\gradlew assembleRelease
```

## 📊 Build Time Estimates

- **First build:** 5-10 minutes (downloads dependencies)
- **Subsequent builds:** 2-5 minutes
- **Clean build:** 3-6 minutes

## ✅ Success Indicators

After successful build, you should see:

```
✅ Agentic Commerce App: SUCCESS
   Location: C:\AgenticCommerce\apps\mobile\android\app\build\outputs\apk\release\app-release.apk
   Size: XX.X MB

✅ User Mandate App: SUCCESS
   Location: C:\AgenticCommerce\apps\mandate-app\android\app\build\outputs\apk\release\app-release.apk
   Size: XX.X MB
```

## 🎉 Next Steps After Building

1. **Test on Device:**
   - Install both APKs
   - Test authentication
   - Test product search
   - Test mandate creation
   - Test deep linking between apps

2. **Configure Backend:**
   - Update API endpoints if needed
   - Set API keys for AI services

3. **Debug:**
   - Use Android Studio Logcat
   - View → Tool Windows → Logcat
   - Filter by package name

## 📚 Additional Resources

- Full guide: `BUILD_AND_DEPLOY_APKS.md`
- Technical docs: `TECHNICAL_ARCHITECTURE.md`
- Android Studio: https://developer.android.com/studio
