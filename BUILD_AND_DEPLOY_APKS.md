# Build and Deploy APKs for AgenticCommerce Apps

This guide will help you build local APKs for both mobile apps and deploy them in Android Studio.

## Prerequisites

1. **Java Development Kit (JDK)**
   - Install JDK 17 or 21
   - Verify: `java -version`

2. **Android Studio**
   - Install Android Studio (latest version)
   - Install Android SDK (API level 33+)
   - Set `ANDROID_HOME` environment variable:
     ```
     ANDROID_HOME=C:\Users\<YourUsername>\AppData\Local\Android\Sdk
     ```

3. **Node.js and pnpm**
   - Node.js v20 or higher
   - pnpm v8 or higher: `npm install -g pnpm`

4. **Environment Variables**
   - Add to PATH:
     - `%ANDROID_HOME%\platform-tools`
     - `%ANDROID_HOME%\tools`
     - `%ANDROID_HOME%\tools\bin`

## Quick Build (PowerShell Script)

Run the unified build script from the project root:

```powershell
.\build-both-apks.ps1
```

This will build both APKs:
- **Agentic Commerce App** (Shopping Cart AI App)
- **User Mandate App**

## Manual Build Steps

### 1. Build Agentic Commerce App (Shopping Cart AI App)

```powershell
# Navigate to mobile app
cd apps\mobile

# Install dependencies (if needed)
pnpm install

# Build APK
.\build-local-apk.ps1
```

**APK Location:** `apps\mobile\android\app\build\outputs\apk\release\app-release.apk`

### 2. Build User Mandate App

```powershell
# Navigate to mandate app
cd apps\mandate-app

# Install dependencies (if needed)
pnpm install

# Build APK
.\build-local-apk.ps1
```

**APK Location:** `apps\mandate-app\android\app\build\outputs\apk\release\app-release.apk`

## Build Variants

### Debug APK (Development)
- Faster build
- Includes debugging symbols
- Not optimized
- Command: `.\gradlew assembleDebug`

### Release APK (Production)
- Optimized and minified
- Smaller size
- Ready for distribution
- Command: `.\gradlew assembleRelease`

## Deploy in Android Studio

### Method 1: Open Project in Android Studio

1. **Open Android Studio**

2. **Open Agentic Commerce App:**
   - File → Open
   - Navigate to: `C:\AgenticCommerce\apps\mobile\android`
   - Click OK

3. **Open User Mandate App:**
   - File → Open (in new window or close previous)
   - Navigate to: `C:\AgenticCommerce\apps\mandate-app\android`
   - Click OK

4. **Sync Gradle:**
   - Android Studio will automatically sync
   - If not, click "Sync Project with Gradle Files" (elephant icon)

5. **Build APK:**
   - Build → Build Bundle(s) / APK(s) → Build APK(s)
   - Wait for build to complete
   - Click "locate" in the notification to find the APK

### Method 2: Install APK Directly to Device/Emulator

1. **Connect Android Device:**
   - Enable USB Debugging on your device
   - Connect via USB
   - Verify: `adb devices`

2. **Install Agentic Commerce App:**
   ```powershell
   adb install apps\mobile\android\app\build\outputs\apk\release\app-release.apk
   ```

3. **Install User Mandate App:**
   ```powershell
   adb install apps\mandate-app\android\app\build\outputs\apk\release\app-release.apk
   ```

### Method 3: Run from Android Studio

1. **Select Device:**
   - Click device dropdown (top toolbar)
   - Select connected device or emulator

2. **Run App:**
   - Click green "Run" button (▶️)
   - Or press `Shift + F10`
   - Android Studio will build and install automatically

## Troubleshooting

### Build Errors

**Error: ANDROID_HOME not set**
```powershell
# Set environment variable (PowerShell)
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"

# Or set permanently:
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk", "User")
```

**Error: Java version mismatch**
- Ensure JDK 17 or 21 is installed
- Set `JAVA_HOME`:
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
  ```

**Error: Gradle build failed**
- Clean build:
  ```powershell
  cd android
  .\gradlew clean
  .\gradlew assembleRelease
  ```

**Error: Metro bundler issues**
- Clear cache:
  ```powershell
  npx react-native start --reset-cache
  ```

### Android Studio Issues

**Project won't sync:**
- File → Invalidate Caches → Invalidate and Restart
- File → Sync Project with Gradle Files

**APK not found:**
- Check build output: `View → Tool Windows → Build`
- APK location: `android\app\build\outputs\apk\release\`

**Device not detected:**
- Enable USB Debugging: Settings → Developer Options → USB Debugging
- Install USB drivers for your device
- Verify: `adb devices`

## APK Locations

After successful build:

- **Agentic Commerce App:**
  - Debug: `apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk`
  - Release: `apps\mobile\android\app\build\outputs\apk\release\app-release.apk`

- **User Mandate App:**
  - Debug: `apps\mandate-app\android\app\build\outputs\apk\debug\app-debug.apk`
  - Release: `apps\mandate-app\android\app\build\outputs\apk\release\app-release.apk`

## Testing the APKs

### On Physical Device

1. Enable "Install from Unknown Sources" in device settings
2. Transfer APK to device
3. Open APK file and install

### On Emulator

1. Start Android Emulator from Android Studio
2. Drag and drop APK into emulator window
3. Or use: `adb install <path-to-apk>`

## Next Steps

After building and installing:

1. **Configure API Endpoints:**
   - Update backend URL in app config if needed
   - Set API keys for AI services

2. **Test Features:**
   - User authentication
   - Product search
   - Shopping cart
   - Mandate creation
   - Deep linking between apps

3. **Debug:**
   - Use Android Studio Logcat for debugging
   - View → Tool Windows → Logcat
   - Filter by app package name

## Package Names

- **Agentic Commerce App:** `com.agentic.commerce`
- **User Mandate App:** Check `apps\mandate-app\android\app\build.gradle` for `applicationId`

## Additional Resources

- [Android Studio User Guide](https://developer.android.com/studio/intro)
- [React Native Android Setup](https://reactnative.dev/docs/environment-setup)
- [Gradle Build Configuration](https://developer.android.com/studio/build)
