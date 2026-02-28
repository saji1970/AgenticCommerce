# Android APK Build & Deploy Guide

## APK Locations (Release builds with bundled JS)

| App | APK Path |
|-----|----------|
| **Mandate** | `apps/mandate-app/android/app/build/outputs/apk/release/app-release.apk` |
| **Agentic (Mobile)** | `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` |

---

## Deploy via Android Studio

### Option 1: Open project and run

1. **Mandate app**
   - File → Open → select `apps/mandate-app/android`
   - Connect device or start emulator
   - Build → Select Build Variant → **release**
   - Run → Run 'app' (green play button)

2. **Mobile app**
   - File → Open → select `apps/mobile/android`
   - Connect device or start emulator
   - Build → Select Build Variant → **release**
   - Run → Run 'app' (green play button)

### Option 2: Install APK from build output

1. Connect device via USB (enable USB debugging) or start an emulator
2. In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)** (or use the Gradle panel)
3. After build, click **locate** in the notification to open the APK folder
4. Or: drag the APK onto the emulator window, or use `adb install -r <path>`

---

## Deploy via ADB (command line)

```powershell
# Connect device first, then:
adb install -r apps\mandate-app\android\app\build\outputs\apk\release\app-release.apk
adb install -r apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

---

## Rebuild from command line

```powershell
# Mandate app
cd apps\mandate-app\android
.\gradlew assembleRelease

# Mobile app (requires NODE_ENV for release bundle)
cd apps\mobile\android
$env:NODE_ENV="production"; .\gradlew assembleRelease
```

---

## Build from Android Studio

1. Open the `android` folder in Android Studio
2. Build → Generate Signed Bundle / APK → APK
3. Or use the Gradle panel: `app` → `Tasks` → `build` → `assembleRelease`
