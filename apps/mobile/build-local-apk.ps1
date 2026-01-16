# Local APK Build Script for Windows PowerShell
# This script builds an Android APK locally using Gradle

Write-Host "🔨 Building Android APK locally..." -ForegroundColor Cyan

# Navigate to mobile app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Verify we're in the correct directory (should contain index.js)
if (-not (Test-Path "index.js")) {
    Write-Host "❌ Error: Not in app directory (index.js not found)!" -ForegroundColor Red
    Write-Host "   Expected directory: apps/mobile" -ForegroundColor Yellow
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Check if Android directory exists
if (-not (Test-Path "android")) {
    Write-Host "❌ Android directory not found. Running prebuild..." -ForegroundColor Yellow
    npx expo prebuild --platform android
}

# Check prerequisites
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Cyan

# Check Java
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "✓ Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Java not found. Please install JDK 17 or 21." -ForegroundColor Red
    exit 1
}

# Check Android SDK
if ($env:ANDROID_HOME) {
    Write-Host "✓ ANDROID_HOME set to: $env:ANDROID_HOME" -ForegroundColor Green
} else {
    Write-Host "⚠️  ANDROID_HOME not set. Build may fail." -ForegroundColor Yellow
    Write-Host "   Set it to your Android SDK path, e.g., C:\Users\$env:USERNAME\AppData\Local\Android\Sdk" -ForegroundColor Yellow
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "`n📦 Installing dependencies..." -ForegroundColor Cyan
    pnpm install
}

# Build variant selection
Write-Host "`n🔧 Select build variant:" -ForegroundColor Cyan
Write-Host "1. Debug (development)"
Write-Host "2. Release (production)"
$choice = Read-Host "Enter choice (1 or 2, default: 2)"

if ($choice -eq "1") {
    $variant = "assembleDebug"
    $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
    Write-Host "Building DEBUG APK..." -ForegroundColor Cyan
} else {
    $variant = "assembleRelease"
    $apkPath = "android\app\build\outputs\apk\release\app-release.apk"
    Write-Host "Building RELEASE APK..." -ForegroundColor Cyan
}

# Set NODE_ENV for proper Metro bundler resolution
$env:NODE_ENV = "production"

# Navigate to Android directory
Set-Location android

# Clean previous build (optional, uncomment if needed)
# Write-Host "`n🧹 Cleaning previous build..." -ForegroundColor Cyan
# .\gradlew clean

# Build APK
Write-Host "`n🔨 Building APK with Gradle..." -ForegroundColor Cyan
Write-Host "This may take several minutes..." -ForegroundColor Yellow

try {
    .\gradlew $variant --no-daemon
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Build successful!" -ForegroundColor Green
        Set-Location ..
        $fullPath = Join-Path $scriptPath $apkPath
        if (Test-Path $fullPath) {
            Write-Host "`n📱 APK location:" -ForegroundColor Green
            Write-Host $fullPath -ForegroundColor White
            Write-Host "`n📊 APK size: $([math]::Round((Get-Item $fullPath).Length / 1MB, 2)) MB" -ForegroundColor Cyan
            
            # Ask if user wants to open the folder
            $openFolder = Read-Host "`nOpen APK folder? (Y/n)"
            if ($openFolder -ne "n" -and $openFolder -ne "N") {
                $folderPath = Split-Path -Parent $fullPath
                explorer $folderPath
            }
        } else {
            Write-Host "⚠️  Build completed but APK not found at expected location." -ForegroundColor Yellow
        }
    } else {
        Write-Host "`n❌ Build failed. Check the error messages above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Build error: $_" -ForegroundColor Red
    exit 1
} finally {
    Set-Location ..
}

