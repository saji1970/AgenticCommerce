# Android Build Troubleshooting Guide

## Common Gradle Build Errors & Solutions

### Error 1: SDK Location Not Found

**Error Message:**
```
SDK location not found. Define location with sdk.dir in the local.properties file
or with an ANDROID_HOME environment variable.
```

**Solution:**

1. Create `local.properties` file in `C:\AgenticCommerce\apps\mobile\android\`:

```properties
sdk.dir=C\:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

Replace `YOUR_USERNAME` with your Windows username.

**Or** set environment variable:
```
ANDROID_HOME=C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk
```

---

### Error 2: Java Version Mismatch

**Error Message:**
```
Unsupported class file major version XX
```

**Solution:**

Android Studio requires **Java 17**. Check your Java version:

```bash
java -version
```

Should show: `java version "17.x.x"`

**Fix:**
1. Open Android Studio
2. Go to **File > Settings > Build, Execution, Deployment > Build Tools > Gradle**
3. Set **Gradle JDK** to **Java 17**
4. Click **Apply**

---

### Error 3: Node Command Not Found

**Error Message:**
```
'node' is not recognized as an internal or external command
```

**Solution:**

Add Node.js to your PATH:

1. Open **System Properties > Environment Variables**
2. Edit **Path** variable
3. Add: `C:\Program Files\nodejs\` (or wherever Node is installed)
4. Restart Android Studio

---

### Error 4: Gradle Daemon Issues

**Error Message:**
```
Gradle build daemon disappeared unexpectedly
```

**Solution:**

Stop all Gradle daemons and clean:

```bash
cd C:\AgenticCommerce\apps\mobile\android
gradlew.bat --stop
gradlew.bat clean
```

Then rebuild in Android Studio.

---

### Error 5: Out of Memory

**Error Message:**
```
OutOfMemoryError: Java heap space
```

**Solution:**

Increase Gradle memory in `gradle.properties`:

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

---

### Error 6: Missing Dependencies

**Error Message:**
```
Could not resolve all dependencies
```

**Solution:**

1. Clean npm cache and reinstall:

```bash
cd C:\AgenticCommerce\apps\mobile
rm -rf node_modules
npm install
```

2. Clean Gradle cache:

```bash
cd android
gradlew.bat clean
```

3. Rebuild in Android Studio

---

### Error 7: Kotlin Plugin Not Found

**Error Message:**
```
Plugin [id: 'org.jetbrains.kotlin.android'] was not found
```

**Solution:**

Update `build.gradle` classpath versions. Add version to kotlin plugin:

```gradle
classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.23')
```

---

## Quick Fix Script

Run this script to fix most common issues:

### Windows (PowerShell):

```powershell
# Navigate to project
cd C:\AgenticCommerce\apps\mobile

# Clean everything
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\.gradle -ErrorAction SilentlyContinue

# Reinstall dependencies
npm install

# Create local.properties with SDK location
$sdkPath = "$env:USERPROFILE\AppData\Local\Android\Sdk"
$sdkPath = $sdkPath.Replace('\', '\\')
"sdk.dir=$sdkPath" | Out-File -FilePath "android\local.properties" -Encoding ASCII

# Clean Gradle
cd android
.\gradlew.bat --stop
.\gradlew.bat clean
```

### Windows (Command Prompt):

```batch
cd C:\AgenticCommerce\apps\mobile

# Clean
rmdir /s /q node_modules
rmdir /s /q android\build
rmdir /s /q android\app\build
rmdir /s /q android\.gradle

# Reinstall
npm install

# Create local.properties
echo sdk.dir=C:\\Users\\%USERNAME%\\AppData\\Local\\Android\\Sdk > android\local.properties

# Clean Gradle
cd android
gradlew.bat --stop
gradlew.bat clean
```

---

## Step-by-Step Android Studio Build

### 1. Check Prerequisites

- [ ] Android Studio installed
- [ ] Java 17 installed (comes with Android Studio)
- [ ] Android SDK installed (comes with Android Studio)
- [ ] Node.js in PATH (`node --version` works)

### 2. Configure Android SDK

1. Open Android Studio
2. Go to **Tools > SDK Manager**
3. Ensure these are installed:
   - Android SDK Platform 34
   - Android SDK Build-Tools 34.0.0
   - Android SDK Platform-Tools
   - Android SDK Tools

### 3. Set Up local.properties

Create `C:\AgenticCommerce\apps\mobile\android\local.properties`:

```properties
sdk.dir=C\:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

### 4. Sync and Build

1. Open project: `C:\AgenticCommerce\apps\mobile\android`
2. Wait for Gradle sync (5-10 minutes first time)
3. If sync fails, check error in **Build** tab at bottom
4. Fix error using solutions above
5. Click **File > Sync Project with Gradle Files**
6. Once synced successfully, click **Run** (green play button)

---

## Check Build Output

### In Android Studio:

1. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Watch **Build** tab at bottom for errors
3. Click on error to see full stacktrace

### From Command Line:

```bash
cd C:\AgenticCommerce\apps\mobile\android
gradlew.bat assembleDebug --stacktrace
```

This will show detailed error messages.

---

## Most Likely Issues for Your Build

Based on the common patterns, your build is probably failing due to one of these:

### 1. Missing local.properties (Most Common)

**Solution:** Create the file as shown above

### 2. Node not in PATH

**Solution:** Add Node to PATH and restart Android Studio

### 3. First-time Gradle download taking too long

**Solution:** Just wait - first build downloads ~500MB of dependencies

---

## Manual Build Steps

If Android Studio keeps failing, build from command line:

```bash
# 1. Navigate to android folder
cd C:\AgenticCommerce\apps\mobile\android

# 2. Create local.properties
echo sdk.dir=C:\\Users\\%USERNAME%\\AppData\\Local\\Android\\Sdk > local.properties

# 3. Stop existing Gradle daemons
gradlew.bat --stop

# 4. Clean project
gradlew.bat clean

# 5. Build debug APK with full logging
gradlew.bat assembleDebug --stacktrace --info

# 6. Check output location
dir app\build\outputs\apk\debug\
```

The APK will be at:
```
C:\AgenticCommerce\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Get Help

If none of these solutions work:

1. Share the exact error message from Android Studio's **Build** tab
2. Share the output of: `gradlew.bat assembleDebug --stacktrace`
3. Check Android Studio's **Event Log** (bottom right) for errors

---

## Quick Health Check

Run these commands to verify your environment:

```bash
# Check Java
java -version
# Should show: java version "17.x.x"

# Check Node
node --version
# Should show: v18.x.x or v20.x.x

# Check npm
npm --version
# Should show: 9.x.x or 10.x.x

# Check Gradle wrapper
cd C:\AgenticCommerce\apps\mobile\android
gradlew.bat --version
# Should show Gradle 8.x
```

All these should work without errors.

---

## Emergency: Use Pre-built APK Method

If all else fails, you can use Expo's build service:

```bash
cd C:\AgenticCommerce\apps\mobile
npx eas build --platform android --profile development
```

This builds in the cloud and downloads the APK.

**Note:** Requires Expo account (free).
