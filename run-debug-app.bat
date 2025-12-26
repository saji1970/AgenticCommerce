@echo off
echo ========================================
echo Starting Agentic Commerce Debug App
echo ========================================
echo.
echo Step 1: Starting Metro Bundler...
start "Metro Bundler" cmd /k "cd apps\mobile-new && npx expo start"
echo.
echo Waiting for Metro to initialize (10 seconds)...
timeout /t 10 /nobreak
echo.
echo Step 2: Installing Debug APK...
adb uninstall com.agenticcommerce.app
REM Updated: This script may need adjustment for mobile-new workflow
REM adb install apps\mobile-new\android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Step 3: Launching App...
adb shell am start -n com.agenticcommerce.app/.MainActivity
echo.
echo ========================================
echo App is running!
echo ========================================
echo.
echo Keep the Metro Bundler window open while using the app.
echo Press any key to stop Metro and exit...
pause
echo.
echo Stopping Metro...
taskkill /FI "WINDOWTITLE eq Metro Bundler*" /F
