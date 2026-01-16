@echo off
echo ====================================
echo Android Emulator Deployment Script
echo ====================================
echo.

REM Check if emulator is running
echo Checking for running emulators...
adb devices
echo.

REM Check if APK exists
if not exist agentic-commerce.apk (
    echo APK not found! Please download from EAS Build first.
    pause
    exit /b 1
)

echo APK found!
echo.

REM Install APK
echo Installing APK to emulator...
adb install -r agentic-commerce.apk

if errorlevel 1 (
    echo Installation failed!
    pause
    exit /b 1
)

echo.
echo Installation successful!
echo.

REM Launch app
echo Launching app...
adb shell am start -n com.agentic.commerce/.MainActivity

echo.
echo ====================================
echo Deployment Complete!
echo ====================================
echo.
pause
