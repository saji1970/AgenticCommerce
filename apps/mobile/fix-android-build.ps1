# Comprehensive Android Build Fix Script
# This script fixes dependency and Metro bundler issues

Write-Host "🔧 Fixing Android Build Dependencies and Configuration..." -ForegroundColor Cyan
Write-Host ""

# Navigate to mobile app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Set NODE_ENV to production for proper Metro bundler resolution
Write-Host "📝 Setting NODE_ENV=production..." -ForegroundColor Cyan
$env:NODE_ENV = "production"

# Verify we're in the correct directory
Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Cyan

# Check if index.js exists
if (-not (Test-Path "index.js")) {
    Write-Host "❌ Error: index.js not found in current directory!" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✓ index.js found" -ForegroundColor Green
}

# Check if Android directory exists
if (-not (Test-Path "android")) {
    Write-Host "❌ Error: android directory not found!" -ForegroundColor Red
    Write-Host "   Run 'npx expo prebuild' first" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Build environment check passed" -ForegroundColor Green
Write-Host ""
Write-Host "To build the APK, use one of these methods:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Method 1 (Recommended): Use Expo CLI" -ForegroundColor Yellow
Write-Host "  npx expo run:android --variant release" -ForegroundColor White
Write-Host ""
Write-Host "Method 2: Use Gradle directly (from android directory)" -ForegroundColor Yellow
Write-Host "  cd android" -ForegroundColor White
Write-Host "  `$env:NODE_ENV='production'; .\gradlew assembleRelease" -ForegroundColor White
Write-Host ""

# Ask if user wants to build now
$buildNow = Read-Host "Build APK now? (Y/n)"
if ($buildNow -ne "n" -and $buildNow -ne "N") {
    Write-Host ""
    Write-Host "🔨 Starting build with Expo CLI..." -ForegroundColor Cyan
    Write-Host "This ensures correct directory setup and Metro bundler configuration" -ForegroundColor Yellow
    Write-Host ""
    
    npx expo run:android --variant release
}

