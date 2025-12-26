@echo off
echo ========================================
echo Building iOS App with EAS
echo ========================================
echo.
echo This will build an iOS app using EAS Build.
echo Note: Requires macOS for local builds, or use EAS cloud builds.
echo Make sure you're logged in: eas login
echo.
pause

cd /d %~dp0
npx eas build --platform ios --profile preview

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Check the link above to download your IPA
pause

