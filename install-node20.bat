@echo off
REM Install Node.js 20 using nvm-windows and start Metro
echo Installing Node.js 20 LTS...
nvm install 20
nvm use 20
node --version
echo Node.js 20 installed and activated
cd C:\AgenticCommerce\apps\mobile
echo Starting Metro bundler...
npx expo start --android
