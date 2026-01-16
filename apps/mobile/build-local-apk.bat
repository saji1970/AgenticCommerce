@echo off
REM Local APK Build Script for Windows Command Prompt
REM This script builds an Android APK locally using Gradle

echo 🔨 Building Android APK locally...

REM Navigate to mobile app directory
cd /d "%~dp0"

REM Verify we're in the correct directory (should contain index.js)
if not exist "index.js" (
    echo ❌ Error: Not in app directory (index.js not found)!
    echo    Expected directory: apps/mobile
    echo    Current directory: %CD%
    exit /b 1
)

REM Check if Android directory exists
if not exist "android" (
    echo ❌ Android directory not found. Running prebuild...
    call npx expo prebuild --platform android
)

REM Check prerequisites
echo.
echo 📋 Checking prerequisites...

REM Check Java
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java not found. Please install JDK 17 or 21.
    exit /b 1
) else (
    echo ✓ Java found
)

REM Check Android SDK
if defined ANDROID_HOME (
    echo ✓ ANDROID_HOME set to: %ANDROID_HOME%
) else (
    echo ⚠️  ANDROID_HOME not set. Build may fail.
    echo    Set it to your Android SDK path, e.g., C:\Users\%USERNAME%\AppData\Local\Android\Sdk
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo.
    echo 📦 Installing dependencies...
    call pnpm install
)

REM Build variant selection
echo.
echo 🔧 Select build variant:
echo 1. Debug (development)
echo 2. Release (production)
set /p choice="Enter choice (1 or 2, default: 2): "

if "%choice%"=="1" (
    set variant=assembleDebug
    set apkPath=android\app\build\outputs\apk\debug\app-debug.apk
    echo Building DEBUG APK...
) else (
    set variant=assembleRelease
    set apkPath=android\app\build\outputs\apk\release\app-release.apk
    echo Building RELEASE APK...
)

REM Set NODE_ENV for proper Metro bundler resolution
set NODE_ENV=production

REM Navigate to Android directory
cd android

REM Build APK
echo.
echo 🔨 Building APK with Gradle...
echo This may take several minutes...

call gradlew.bat %variant% --no-daemon
if %errorlevel% equ 0 (
    echo.
    echo ✅ Build successful!
    cd ..
    if exist "%apkPath%" (
        echo.
        echo 📱 APK location:
        echo %cd%\%apkPath%
        echo.
        
        REM Ask if user wants to open the folder
        set /p openFolder="Open APK folder? (Y/n): "
        if /i not "%openFolder%"=="n" (
            for %%F in ("%apkPath%") do explorer /select, "%%~dpF%%~nxF"
        )
    ) else (
        echo ⚠️  Build completed but APK not found at expected location.
    )
) else (
    echo.
    echo ❌ Build failed. Check the error messages above.
    cd ..
    exit /b 1
)

cd ..

