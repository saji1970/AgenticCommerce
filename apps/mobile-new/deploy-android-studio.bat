@echo off
echo ========================================
echo Deploy to Android Device via ADB
echo ========================================
echo.
echo This will:
echo 1. Build the debug APK
echo 2. Install it on your connected Android device
echo.
echo Make sure:
echo - Android device is connected via USB
echo - USB Debugging is enabled
echo - Device is recognized by ADB (run: adb devices)
echo.
pause

cd /d %~dp0

echo.
echo Step 1: Building APK...
cd android
call gradlew.bat assembleDebug

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Build failed! Check errors above.
    pause
    exit /b 1
)

echo.
echo Step 2: Checking for connected devices...
adb devices

echo.
echo Step 3: Installing APK on device...
adb install -r app\build\outputs\apk\debug\app-debug.apk

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Installation Successful!
    echo ========================================
    echo.
    echo The app has been installed on your device.
    echo You can find it in your app drawer.
    echo.
) else (
    echo.
    echo Installation failed!
    echo Make sure:
    echo - Device is connected and recognized by ADB
    echo - USB Debugging is enabled
    echo - Try running: adb devices
    echo.
)

pause


