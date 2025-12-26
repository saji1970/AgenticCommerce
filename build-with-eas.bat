@echo off
echo ========================================
echo EAS Build Script
echo ========================================
echo.
echo This will build your app using Expo EAS Build
echo You'll need to answer a prompt about generating a keystore.
echo.
echo Starting build...
echo.

cd apps\mobile-new
npx eas build --platform android --profile preview --clear-cache

echo.
echo ========================================
echo Build complete!
echo ========================================
echo.
echo Download the APK from the link above and install with:
echo adb install downloaded-app.apk
echo.
pause
