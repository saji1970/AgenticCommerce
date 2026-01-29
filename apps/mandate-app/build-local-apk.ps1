# Build Local APK Script for Windows
# This script builds an APK locally using Gradle (bypassing EAS)

Write-Host "Building Mandate App APK locally..." -ForegroundColor Green

# Navigate to mandate-app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Step 1: Generating native Android project..." -ForegroundColor Yellow
npx expo prebuild --platform android --clean

if ($LASTEXITCODE -ne 0) {
    Write-Host "Prebuild failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Step 2: Building APK with Gradle..." -ForegroundColor Yellow
Set-Location android

# Build release APK
.\gradlew assembleRelease

if ($LASTEXITCODE -ne 0) {
    Write-Host "Gradle build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

$apkPath = "android/app/build/outputs/apk/release/app-release.apk"
if (Test-Path $apkPath) {
    Write-Host "`n✅ APK built successfully!" -ForegroundColor Green
    Write-Host "Location: $((Resolve-Path $apkPath).Path)" -ForegroundColor Cyan
    Write-Host "`nYou can install this APK on your Android device." -ForegroundColor Yellow
} else {
    Write-Host "`n❌ APK not found at expected location" -ForegroundColor Red
    exit 1
}
