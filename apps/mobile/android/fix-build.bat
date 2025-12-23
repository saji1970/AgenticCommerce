@echo off
echo =====================================
echo Android Build Fix Script
echo =====================================
echo.

REM Step 1: Create local.properties
echo Step 1: Creating local.properties...
echo sdk.dir=C:\\Users\\%USERNAME%\\AppData\\Local\\Android\\Sdk > local.properties
echo   Done!
echo.

REM Step 2: Stop Gradle daemons
echo Step 2: Stopping Gradle daemons...
call gradlew.bat --stop
echo   Done!
echo.

REM Step 3: Clean build
echo Step 3: Cleaning build directories...
if exist build rmdir /s /q build
if exist app\build rmdir /s /q app\build
if exist .gradle rmdir /s /q .gradle
echo   Done!
echo.

REM Step 4: Clean Gradle
echo Step 4: Running Gradle clean...
call gradlew.bat clean
echo   Done!
echo.

echo =====================================
echo Fix completed!
echo =====================================
echo.
echo Next steps:
echo 1. Open Android Studio
echo 2. Open this project
echo 3. Wait for Gradle sync
echo 4. Click Run button
echo.
echo If build still fails, check ANDROID_BUILD_FIX.md
echo.
pause
