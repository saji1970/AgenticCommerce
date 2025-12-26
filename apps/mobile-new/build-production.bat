@echo off
echo ========================================
echo Building Production Apps
echo ========================================
echo.
echo This will build production versions for both platforms.
echo Android: AAB for Google Play Store
echo iOS: IPA for App Store
echo.
echo Make sure you're logged in: eas login
echo.
pause

cd /d %~dp0
echo.
echo Building Android Production...
npx eas build --platform android --profile production

echo.
echo Building iOS Production...
npx eas build --platform ios --profile production

echo.
echo ========================================
echo Production Builds Complete!
echo ========================================
echo.
echo Check the links above to download your builds
pause

