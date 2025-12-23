@echo off
cd /d %~dp0
echo Building Android Debug APK...
echo.
gradlew.bat clean assembleDebug --stacktrace --info
echo.
echo Build complete!
pause
