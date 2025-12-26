@echo off
echo ========================================
echo Opening Android Studio
echo ========================================
echo.
echo This will open the Android project in Android Studio.
echo Make sure Android Studio is installed!
echo.
pause

cd /d %~dp0

REM Try to open with Android Studio command line (if available)
if exist "%LOCALAPPDATA%\Programs\Android\Android Studio\bin\studio64.exe" (
    "%LOCALAPPDATA%\Programs\Android\Android Studio\bin\studio64.exe" android
) else if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    "C:\Program Files\Android\Android Studio\bin\studio64.exe" android
) else (
    echo.
    echo Android Studio not found in default locations.
    echo Please open Android Studio manually:
    echo 1. Open Android Studio
    echo 2. Click "Open"
    echo 3. Navigate to: %CD%\android
    echo 4. Select the "android" folder
    echo.
    pause
)

