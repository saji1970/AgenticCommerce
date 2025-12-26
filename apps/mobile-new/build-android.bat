@echo off
echo ========================================
echo Building Android App with EAS
echo ========================================
echo.
echo This will build an Android APK using EAS Build.
echo Make sure you're logged in: eas login
echo.
pause

cd /d %~dp0
npx eas build --platform android --profile preview

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Check the link above to download your APK
pause

