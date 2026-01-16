# Deploy APK to Android Device/Emulator Script
# This script builds the APK and deploys it to a connected Android device/emulator

Write-Host "🚀 Building and Deploying APK to Android..." -ForegroundColor Cyan
Write-Host ""

# Navigate to mobile app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Verify we're in the correct directory
if (-not (Test-Path "index.js")) {
    Write-Host "❌ Error: Not in app directory (index.js not found)!" -ForegroundColor Red
    Write-Host "   Expected directory: apps/mobile" -ForegroundColor Yellow
    exit 1
}

# Set NODE_ENV
$env:NODE_ENV = "production"
Write-Host "✓ NODE_ENV set to production" -ForegroundColor Green

# Check for connected devices
Write-Host "`n📱 Checking for connected Android devices/emulators..." -ForegroundColor Cyan
$devices = adb devices 2>&1 | Select-String -Pattern "device$"
$deviceCount = ($devices | Measure-Object).Count

if ($deviceCount -eq 0) {
    Write-Host "⚠️  No devices/emulators found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "  1. Connect a device via USB (enable USB debugging)" -ForegroundColor White
    Write-Host "  2. Or start an Android emulator" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Continue with build only? (Y/n)"
    if ($continue -eq "n" -or $continue -eq "N") {
        exit 0
    }
    $skipDeploy = $true
} else {
    Write-Host "✓ Found $deviceCount device(s):" -ForegroundColor Green
    $devices | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    $skipDeploy = $false
}

# Build method selection
Write-Host "`n🔧 Select build method:" -ForegroundColor Cyan
Write-Host "1. Expo CLI (builds and installs automatically)" -ForegroundColor White
Write-Host "2. Gradle only (build APK, then install separately)" -ForegroundColor White
$buildMethod = Read-Host "Enter choice (1 or 2, default: 1)"

if ($buildMethod -eq "2") {
    # Build using Gradle
    Write-Host "`n🔨 Building APK with Gradle..." -ForegroundColor Cyan
    
    if (-not (Test-Path "android")) {
        Write-Host "❌ Android directory not found. Running prebuild..." -ForegroundColor Yellow
        npx expo prebuild --platform android
    }
    
    Set-Location android
    Write-Host "Building release APK (this may take several minutes)..." -ForegroundColor Yellow
    .\gradlew assembleRelease --no-daemon
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Build failed!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    Set-Location ..
    $apkPath = "android\app\build\outputs\apk\release\app-release.apk"
    
    if (-not (Test-Path $apkPath)) {
        Write-Host "`n❌ APK not found at expected location!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n✅ APK built successfully!" -ForegroundColor Green
    Write-Host "   Location: $apkPath" -ForegroundColor White
    
    # Deploy if device is available
    if (-not $skipDeploy) {
        Write-Host "`n📲 Installing APK on device..." -ForegroundColor Cyan
        $fullPath = Resolve-Path $apkPath
        adb install -r $fullPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ APK installed successfully!" -ForegroundColor Green
            
            $launch = Read-Host "`nLaunch the app? (Y/n)"
            if ($launch -ne "n" -and $launch -ne "N") {
                Write-Host "Launching app..." -ForegroundColor Cyan
                adb shell am start -n com.agentic.commerce/.MainActivity
            }
        } else {
            Write-Host "`n⚠️  Installation failed. Try manually:" -ForegroundColor Yellow
            Write-Host "   adb install -r $fullPath" -ForegroundColor White
        }
    } else {
        Write-Host "`n📦 APK ready for manual installation:" -ForegroundColor Cyan
        Write-Host "   $apkPath" -ForegroundColor White
        Write-Host "`nTo install manually:" -ForegroundColor Yellow
        Write-Host "   adb install -r $apkPath" -ForegroundColor White
    }
} else {
    # Build and deploy using Expo CLI
    Write-Host "`n🔨 Building and deploying with Expo CLI..." -ForegroundColor Cyan
    Write-Host "This will build and install automatically on connected device/emulator" -ForegroundColor Yellow
    Write-Host ""
    
    npx expo run:android --variant release
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Build and deployment successful!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Build/deployment failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✅ Done!" -ForegroundColor Green

