@echo off
echo ========================================
echo Starting Metro Bundler and Deploying App
echo ========================================
echo.
echo This will:
echo 1. Set up port forwarding (adb reverse)
echo 2. Start Metro bundler
echo 3. Build and install the app
echo.
pause

cd /d %~dp0

echo.
echo Step 1: Setting up port forwarding...
adb reverse tcp:8081 tcp:8081

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Warning: Could not set up port forwarding.
    echo Make sure your device is connected.
    echo.
)

echo.
echo Step 2: Starting Metro bundler...
echo.
echo Metro will start in a new window.
echo Keep it running and reload the app (shake device > Reload)
echo.
start "Metro Bundler" cmd /k "npx expo start --dev-client"

echo.
echo Step 3: Waiting 10 seconds for Metro to start...
timeout /t 10 /nobreak >nul

echo.
echo Step 4: Building and installing app...
cd android
call gradlew.bat installDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Installation Complete!
    echo ========================================
    echo.
    echo The app has been installed.
    echo.
    echo IMPORTANT: Make sure Metro bundler is running!
    echo - Check the "Metro Bundler" window
    echo - It should show "Metro waiting on..."
    echo.
    echo To reload the app:
    echo - Shake device and tap "Reload"
    echo - Or press 'R' twice in Metro terminal
    echo.
) else (
    echo.
    echo Build/Install failed. Check errors above.
    echo.
)

pause

