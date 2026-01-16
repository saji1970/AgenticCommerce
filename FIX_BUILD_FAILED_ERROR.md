# Fix Android Build Failed Error

## Problem

The build failed with this error:
```
BUILD FAILED in 20s
Error: gradlew.bat app:assembleRelease exited with non-zero code: 1
```

But the actual error details are not shown in the output you've shared.

## How to See the Actual Error

### Method 1: Check the Full Build Output

Scroll up in your terminal to see the actual error. Look for lines that contain:
- `FAILURE`
- `Error:`
- `FAILED`
- `> Task :app:... FAILED`

The actual error will be before the "BUILD FAILED" message.

### Method 2: Run Build with More Details

Run the build with more verbose output:

```powershell
cd apps\mobile
$env:NODE_ENV = "production"
cd android
.\gradlew assembleRelease --stacktrace --info 2>&1 | Select-Object -Last 200
```

This will show the detailed error.

### Method 3: Check Build Reports

```powershell
cd apps\mobile\android
Get-Content build\reports\problems\problems-report.html | Select-Object -Last 100
```

## Common Build Errors and Fixes

### Error 1: Metro Bundler - "Unable to resolve module ./index.js"

**Fix:**
```powershell
cd apps\mobile
$env:NODE_ENV = "production"
npx expo run:android --variant release
```

### Error 2: Java/JDK Issues

**Check Java:**
```powershell
java -version
```

Should show Java 17 or 21. If not, install JDK 17 or 21.

**Set JAVA_HOME:**
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"  # Adjust path
```

### Error 3: Android SDK Issues

**Check ANDROID_HOME:**
```powershell
echo $env:ANDROID_HOME
```

Should be set to your Android SDK path (e.g., `C:\Users\YourUsername\AppData\Local\Android\Sdk`)

**Fix:**
```powershell
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
```

### Error 4: Dependency Resolution Issues

**Clean and rebuild:**
```powershell
cd apps\mobile\android
.\gradlew clean
cd ..
$env:NODE_ENV = "production"
cd android
.\gradlew assembleRelease
```

### Error 5: Missing Dependencies

**Reinstall dependencies:**
```powershell
cd apps\mobile
pnpm install
cd android
.\gradlew clean
.\gradlew assembleRelease
```

### Error 6: Gradle Cache Issues

**Clean Gradle cache:**
```powershell
cd apps\mobile\android
.\gradlew clean --refresh-dependencies
.\gradlew assembleRelease
```

## Quick Diagnostic Commands

Run these to check your environment:

```powershell
# Check Java
java -version

# Check Android SDK
echo $env:ANDROID_HOME
if (Test-Path $env:ANDROID_HOME) { Write-Host "✓ ANDROID_HOME exists" } else { Write-Host "✗ ANDROID_HOME path not found" }

# Check Node
node --version

# Check if in correct directory
cd apps\mobile
Test-Path index.js
Test-Path android

# Check NODE_ENV
echo $env:NODE_ENV
```

## Recommended Fix Steps

1. **First, see the actual error:**
   - Scroll up in your terminal
   - Look for the actual error message
   - Or run: `.\gradlew assembleRelease --stacktrace`

2. **Check environment:**
   - Java installed? (`java -version`)
   - ANDROID_HOME set? (`echo $env:ANDROID_HOME`)
   - NODE_ENV set? (`echo $env:NODE_ENV`)

3. **Try clean build:**
   ```powershell
   cd apps\mobile
   $env:NODE_ENV = "production"
   cd android
   .\gradlew clean
   .\gradlew assembleRelease --stacktrace
   ```

4. **If still failing, use Expo CLI:**
   ```powershell
   cd apps\mobile
   $env:NODE_ENV = "production"
   npx expo run:android --variant release
   ```

## Next Steps

**Please share the actual error message** from the build output (scroll up in your terminal) so I can provide a specific fix. The error message will tell us exactly what went wrong.

Common places to find the error:
- Look for lines with `FAILED` or `Error:` before "BUILD FAILED"
- Check the task that failed (e.g., `> Task :app:createBundleReleaseJsAndAssets FAILED`)
- Look for exception stack traces

