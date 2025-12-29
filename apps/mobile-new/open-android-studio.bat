@echo off
echo ========================================
echo Opening Android Studio
echo ========================================
echo.
echo This will open the Android project in Android Studio.
echo.
echo After Android Studio opens:
echo 1. Wait for Gradle sync to complete (5-10 minutes first time)
echo 2. Connect your Android device via USB
echo 3. Enable USB Debugging on your device
echo 4. Click the Run button (green play icon)
echo 5. Select your device and click OK
echo.
pause

cd /d %~dp0

REM Try to open with Android Studio command line (if available)
set "STUDIO_PATH="

if exist "%LOCALAPPDATA%\Programs\Android\Android Studio\bin\studio64.exe" (
    set "STUDIO_PATH=%LOCALAPPDATA%\Programs\Android\Android Studio\bin\studio64.exe"
) else if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    set "STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe"
) else if exist "C:\Program Files (x86)\Android\Android Studio\bin\studio64.exe" (
    set "STUDIO_PATH=C:\Program Files (x86)\Android\Android Studio\bin\studio64.exe"
)

if defined STUDIO_PATH (
    echo.
    echo Opening Android Studio...
    "%STUDIO_PATH%" android
) else (
    echo.
    echo Android Studio not found in default locations.
    echo.
    echo Please open Android Studio manually:
    echo 1. Open Android Studio
    echo 2. Click "Open" or "File > Open"
    echo 3. Navigate to: %CD%\android
    echo 4. Select the "android" folder
    echo.
    pause
)
