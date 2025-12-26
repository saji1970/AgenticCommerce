# Deploy in Android Studio - Step by Step Guide

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Android Studio installed (latest version recommended)
- [ ] Java 17 installed (comes with Android Studio)
- [ ] Android SDK installed (comes with Android Studio)
- [ ] Node.js installed and in PATH
- [ ] An Android device connected OR Android emulator set up

## Step 1: Open Project in Android Studio

1. **Launch Android Studio**

2. **Open the Android project**:
   - Click **File > Open**
   - Navigate to: `C:\AgenticCommerce\apps\mobile\android`
   - Click **OK**

3. **Wait for Gradle Sync**:
   - Android Studio will automatically start syncing Gradle
   - This may take 5-10 minutes on first open
   - Watch the bottom status bar for progress

## Step 2: Verify Configuration

### Check SDK Location

1. Go to **File > Settings** (or **File > Project Structure**)
2. Navigate to **Appearance & Behavior > System Settings > Android SDK**
3. Note the **Android SDK Location** (usually: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`)

### Verify local.properties

1. Check if `apps/mobile/android/local.properties` exists
2. If not, create it with:
   ```properties
   sdk.dir=C\:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
   ```
   Replace `YOUR_USERNAME` with your Windows username.

### Verify Java Version

1. Go to **File > Settings > Build, Execution, Deployment > Build Tools > Gradle**
2. Ensure **Gradle JDK** is set to **Java 17** (or **jbr-17**)
3. Click **Apply** and **OK**

## Step 3: Sync Gradle Files

1. Click **File > Sync Project with Gradle Files**
   - Or click the **Sync Now** banner if it appears
   - Wait for sync to complete (check bottom status bar)

2. **If sync fails**, check the **Build** tab at the bottom:
   - Look for error messages
   - Common issues:
     - Missing SDK: Install via **Tools > SDK Manager**
     - Node not found: Add Node.js to PATH
     - Gradle version: Android Studio will suggest updates

## Step 4: Build the Project

### Option A: Build Debug APK (Recommended for Testing)

1. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Wait for build to complete
3. When done, click **locate** in the notification to find the APK:
   - Location: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

### Option B: Build Release APK

1. Go to **Build > Generate Signed Bundle / APK**
2. Select **APK** and click **Next**
3. For testing, you can use the debug keystore (already configured)
4. Click **Next** and **Finish**
5. APK location: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

## Step 5: Run on Device/Emulator

### Set Up Device/Emulator

**Option 1: Physical Device**
1. Enable **Developer Options** on your Android device:
   - Go to **Settings > About Phone**
   - Tap **Build Number** 7 times
2. Enable **USB Debugging**:
   - Go to **Settings > Developer Options**
   - Enable **USB Debugging**
3. Connect device via USB
4. Allow USB debugging when prompted on device

**Option 2: Android Emulator**
1. Go to **Tools > Device Manager**
2. Click **Create Device**
3. Select a device (e.g., Pixel 5)
4. Select a system image (e.g., Android 13)
5. Click **Finish** and wait for download
6. Click **Play** button to start emulator

### Run the App

1. **Select your device/emulator** from the device dropdown (top toolbar)
2. Click the **Run** button (green play icon ▶️) or press **Shift + F10**
3. Wait for build and installation
4. App should launch on your device/emulator

## Step 6: Monitor Build Output

### View Build Logs

1. Open **Build** tab at the bottom of Android Studio
2. Watch for:
   - ✅ **BUILD SUCCESSFUL** - Everything worked!
   - ❌ **BUILD FAILED** - Check error messages

### View Logcat (Runtime Logs)

1. Open **Logcat** tab at the bottom
2. Filter by your app: `com.agenticcommerce.app`
3. Watch for errors or app output

## Troubleshooting

### Issue: "SDK location not found"

**Solution:**
1. Create `apps/mobile/android/local.properties`
2. Add: `sdk.dir=C\:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk`
3. Replace `YOUR_USERNAME` with your username
4. Click **File > Sync Project with Gradle Files**

### Issue: "Gradle sync failed"

**Solution:**
1. Check **Build** tab for specific error
2. Common fixes:
   - **Node not found**: Add Node.js to PATH, restart Android Studio
   - **SDK missing**: Install via **Tools > SDK Manager**
   - **Gradle version**: Let Android Studio update Gradle wrapper

### Issue: "Device not detected"

**Solution:**
1. For physical device:
   - Check USB cable connection
   - Enable USB debugging on device
   - Install device drivers (Windows may prompt)
2. For emulator:
   - Ensure emulator is running (check Device Manager)
   - Wait for emulator to fully boot

### Issue: "Build takes too long"

**Solution:**
1. First build always takes 10-15 minutes (downloading dependencies)
2. Subsequent builds are faster (2-5 minutes)
3. If still slow:
   - Increase Gradle memory in `gradle.properties`:
     ```properties
     org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
     ```
   - Enable Gradle daemon (usually enabled by default)

### Issue: "App crashes on launch"

**Solution:**
1. Check **Logcat** for error messages
2. Common causes:
   - Missing permissions (check AndroidManifest.xml)
   - JavaScript errors (check Metro bundler output)
   - Native module issues
3. Try:
   - Clean build: **Build > Clean Project**
   - Rebuild: **Build > Rebuild Project**
   - Clear app data on device and reinstall

## Quick Commands (Terminal Alternative)

If you prefer command line:

```bash
# Navigate to android folder
cd C:\AgenticCommerce\apps\mobile\android

# Clean previous builds
gradlew.bat clean

# Build debug APK
gradlew.bat assembleDebug

# Build release APK
gradlew.bat assembleRelease

# Install on connected device
gradlew.bat installDebug
```

## Verify Installation

After deployment:

1. **Check device**: App icon should appear in app drawer
2. **Launch app**: Tap icon to open
3. **Check Logcat**: Should show app starting without errors
4. **Test features**: Navigate through app to verify functionality

## Next Steps

- **Development**: Use debug builds for testing
- **Production**: Use release builds or EAS Build for distribution
- **Updates**: After code changes, click **Run** again to deploy updates

## Additional Resources

- Android Studio Documentation: https://developer.android.com/studio
- React Native Android Setup: https://reactnative.dev/docs/environment-setup
- Expo Documentation: https://docs.expo.dev/

