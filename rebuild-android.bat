@echo off
echo Cleaning and rebuilding Android app...
echo.

cd apps\mobile\android
call gradlew clean
if errorlevel 1 (
    echo Clean failed!
    pause
    exit /b 1
)

call gradlew assembleDebug
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo ✓ Build successful!
echo APK location: apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
pause
