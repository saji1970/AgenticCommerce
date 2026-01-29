# Build and Deploy APK Script for Agentic Commerce Mobile App
# This script builds an Android APK and deploys it to the emulator

Write-Host "Building and Deploying Android APK..." -ForegroundColor Cyan

# Navigate to mobile app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Verify we're in the correct directory
if (-not (Test-Path "index.js")) {
    Write-Host "❌ Error: Not in app directory (index.js not found)!" -ForegroundColor Red
    exit 1
}

# Check if Android directory exists
if (-not (Test-Path "android")) {
    Write-Host "Running Expo prebuild..." -ForegroundColor Cyan
    npx expo prebuild --platform android
}

# Set NODE_ENV
$env:NODE_ENV = "production"

# Build and install APK using Expo
Write-Host "`nBuilding APK with Expo..." -ForegroundColor Cyan
Write-Host "This will build and install the APK on the connected device/emulator..." -ForegroundColor Yellow

try {
    # Use expo run:android to build and install
    npx expo run:android --variant debug --no-build-cache
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nBuild and deployment successful!" -ForegroundColor Green
        
        # Find the APK location
        $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
        $fullPath = Join-Path $scriptPath $apkPath
        
        if (Test-Path $fullPath) {
            Write-Host "`nAPK location:" -ForegroundColor Green
            Write-Host $fullPath -ForegroundColor White
            Write-Host "`nAPK size: $([math]::Round((Get-Item $fullPath).Length / 1MB, 2)) MB" -ForegroundColor Cyan
            Write-Host "`nAPK has been installed on the emulator/device!" -ForegroundColor Green
        }
    } else {
        Write-Host "`n❌ Build failed. Check the error messages above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Build error: $_" -ForegroundColor Red
    exit 1
}
