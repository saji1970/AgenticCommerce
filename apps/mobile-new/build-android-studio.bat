@echo off
echo ========================================
echo Building Android APK with Gradle
echo ========================================
echo.
echo This will build a debug APK using Gradle.
echo The APK will be at: android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause

cd /d %~dp0\android

echo.
echo Building debug APK...
call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Build Successful!
    echo ========================================
    echo.
    echo APK Location:
    echo %CD%\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo To install on device:
    echo adb install app\build\outputs\apk\debug\app-debug.apk
    echo.
) else (
    echo.
    echo ========================================
    echo Build Failed!
    echo ========================================
    echo.
    echo Check the error messages above
    echo.
)

pause


