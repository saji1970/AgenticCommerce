@echo off
echo ========================================
echo Starting Expo Go Development Server
echo ========================================
echo.
echo This will start the Metro bundler for Expo Go.
echo.
echo Steps:
echo 1. Make sure Expo Go app is installed on your phone
echo 2. Scan the QR code that appears
echo 3. Your app will load on your phone!
echo.
echo Press Ctrl+C to stop the server
echo.
pause

cd /d %~dp0
npm start



