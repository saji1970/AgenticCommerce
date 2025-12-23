# Android Build Issues - Quick Fix

## Your build failed in Android Studio? Here's the fix!

### ⚡ Quick Fix (30 seconds)

1. **Close Android Studio** if it's open

2. **Run the fix script:**

   **Option A - Double-click this file:**
   ```
   C:\AgenticCommerce\apps\mobile\android\fix-build.bat
   ```

   **Option B - Or run in PowerShell:**
   ```powershell
   cd C:\AgenticCommerce\apps\mobile\android
   .\fix-build.ps1
   ```

3. **Reopen Android Studio**

4. **Open the project:**
   ```
   C:\AgenticCommerce\apps\mobile\android
   ```

5. **Wait for Gradle sync to complete** (5-10 minutes first time)

6. **Click the Run button** (green play icon ▶️)

That's it! The build should work now.

---

## What the fix script does:

✅ Creates `local.properties` with correct Android SDK path
✅ Stops all Gradle daemon processes
✅ Cleans build directories
✅ Cleans Gradle cache
✅ Prepares project for fresh build

---

## If build still fails after running the fix:

### Check these common issues:

#### 1. Android SDK not installed
- Open Android Studio
- Go to **Tools > SDK Manager**
- Install **Android SDK Platform 34**
- Install **Android SDK Build-Tools 34.0.0**

#### 2. Wrong Java version
- Android Studio requires **Java 17**
- Check: `java -version` (should show 17.x.x)
- Fix: In Android Studio, go to **File > Settings > Build, Execution, Deployment > Build Tools > Gradle**
- Set **Gradle JDK** to **Java 17**

#### 3. Node.js not in PATH
- Check: `node --version` (should work)
- Fix: Add `C:\Program Files\nodejs\` to Windows PATH
- Restart Android Studio after changing PATH

---

## Get the exact error message:

1. In Android Studio, click **Build** tab at the bottom
2. Look for RED error messages
3. Copy the error text
4. Search for it in `ANDROID_BUILD_FIX.md` for specific solutions

Or run this to see detailed build log:

```bash
cd C:\AgenticCommerce\apps\mobile\android
gradlew.bat assembleDebug --stacktrace
```

---

## Most common errors and quick fixes:

### "SDK location not found"
✅ **Fixed by the script** - It creates `local.properties`

### "Could not resolve com.android.tools.build:gradle"
🔧 **Fix:** Check internet connection and run:
```bash
gradlew.bat --refresh-dependencies
```

### "Execution failed for task ':app:processDebugResources'"
🔧 **Fix:** Clean and rebuild:
```bash
gradlew.bat clean
```

### "OutOfMemoryError: Java heap space"
🔧 **Fix:** Edit `gradle.properties`, change to:
```
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

---

## Build taking too long?

**First build:** 10-15 minutes (downloads ~500MB of dependencies) ⏳
**Next builds:** 2-3 minutes ⚡

If it's been running for 30+ minutes:
1. Stop the build (red square button)
2. Run `fix-build.bat`
3. Try again

---

## Alternative: Build from Command Line

If Android Studio keeps having issues:

```bash
cd C:\AgenticCommerce\apps\mobile\android
fix-build.bat
gradlew.bat assembleDebug
```

APK will be at:
```
app\build\outputs\apk\debug\app-debug.apk
```

---

## Need more help?

📖 **Detailed Guide:** `C:\AgenticCommerce\ANDROID_BUILD_FIX.md`

📱 **Quick Start:** `C:\AgenticCommerce\ANDROID_STUDIO_QUICK_START.md`

🔧 **Full Build Guide:** `C:\AgenticCommerce\ANDROID_BUILD_GUIDE.md`

---

## Emergency: Cloud Build

If nothing works, use Expo's cloud build:

```bash
cd C:\AgenticCommerce\apps\mobile
npx eas build --platform android --profile development
```

Requires free Expo account.
