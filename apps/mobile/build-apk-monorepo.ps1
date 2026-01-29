# Build APK Script for Monorepo
# This script handles the monorepo bundling issue by manually creating the JS bundle
# then building the APK with Gradle

Write-Host "Building Android APK for Monorepo..." -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

# Get script directory and set as working directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Working directory: $scriptPath" -ForegroundColor Gray

# Set NODE_ENV
$env:NODE_ENV = "production"

# Verify we're in the correct directory
if (-not (Test-Path "index.js")) {
    Write-Host "Error: index.js not found in $scriptPath" -ForegroundColor Red
    exit 1
}

# Check if Android directory exists
if (-not (Test-Path "android")) {
    Write-Host "Android directory not found. Running prebuild..." -ForegroundColor Yellow
    npx expo prebuild --platform android
}

# Create assets directory if it doesn't exist
$assetsDir = "android\app\src\main\assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

Write-Host ""
Write-Host "Step 1: Creating JS bundle..." -ForegroundColor Cyan

# Create the JS bundle using react-native bundle with absolute path (works in monorepo)
$entryFile = Join-Path $scriptPath "index.js"
$bundleOutput = Join-Path $scriptPath "android\app\src\main\assets\index.android.bundle"
$assetsOutput = Join-Path $scriptPath "android\app\src\main\res"

try {
    npx react-native bundle `
        --platform android `
        --dev false `
        --entry-file "$entryFile" `
        --bundle-output "$bundleOutput" `
        --assets-dest "$assetsOutput" `
        --config metro.config.js

    if ($LASTEXITCODE -ne 0) {
        throw "Bundle creation failed"
    }
    Write-Host "Bundle created successfully at: $bundleOutput" -ForegroundColor Green
} catch {
    Write-Host "Error creating bundle: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Building APK with Gradle (skipping JS bundling)..." -ForegroundColor Cyan

# Navigate to Android directory
Set-Location android

# Build the APK, skipping the JS bundle task since we already created it
try {
    # Use -x to exclude the bundle task since we already created it
    .\gradlew.bat assembleRelease -x createBundleReleaseJsAndAssets --no-daemon

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Build successful!" -ForegroundColor Green

        $apkPath = "app\build\outputs\apk\release\app-release.apk"
        $fullApkPath = Join-Path $scriptPath "android" $apkPath

        if (Test-Path $fullApkPath) {
            $apkSize = [math]::Round((Get-Item $fullApkPath).Length / 1MB, 2)
            Write-Host ""
            Write-Host "APK Location: $fullApkPath" -ForegroundColor Green
            Write-Host "APK Size: $apkSize MB" -ForegroundColor Cyan
        } else {
            Write-Host "Build completed but APK not found at expected location" -ForegroundColor Yellow
            Write-Host "Checking for APK files..." -ForegroundColor Yellow
            Get-ChildItem -Recurse -Filter "*.apk" app\build\outputs\ 2>$null | ForEach-Object { Write-Host $_.FullName }
        }
    } else {
        throw "Gradle build failed"
    }
} catch {
    Write-Host "Error during Gradle build: $_" -ForegroundColor Red
    exit 1
} finally {
    Set-Location $scriptPath
}

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
