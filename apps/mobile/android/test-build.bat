@echo off
echo =====================================
echo Testing Android Build
echo =====================================
echo.
echo Cleaning previous build...
call gradlew.bat clean
echo.
echo Building debug APK...
call gradlew.bat assembleDebug
echo.
if exist app\build\outputs\apk\debug\app-debug.apk (
    echo.
    echo =====================================
    echo BUILD SUCCESSFUL!
    echo =====================================
    echo.
    echo APK location:
    echo app\build\outputs\apk\debug\app-debug.apk
    echo.
) else (
    echo.
    echo =====================================
    echo BUILD FAILED - Check errors above
    echo =====================================
    echo.
)
pause
