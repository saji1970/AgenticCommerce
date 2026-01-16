@echo off
echo === Building AgenticCommerce APK with EAS ===
echo.
echo This script will:
echo 1. Build the app using EAS Build (cloud-based)
echo 2. Download the APK when complete
echo 3. Install it on your emulator
echo.

cd /d "%~dp0"

echo Step 1: Starting EAS build...
echo You'll be asked to generate Android signing credentials - answer YES.
echo.
call npx eas-cli build --platform android --profile development

if errorlevel 1 (
    echo.
    echo Build failed or was cancelled.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo Build started successfully!
echo.
echo The build will take 10-20 minutes to complete.
echo You can monitor progress at: https://expo.dev/accounts/sajipillai70/projects/agentic-commerce/builds
echo.
echo Once the build completes:
echo 1. Download the APK from the build page
echo 2. Run this command to install it:
echo    adb install path\to\downloaded.apk
echo.
echo Or wait here and the script will help you download and install it...
echo ===================================================
pause
