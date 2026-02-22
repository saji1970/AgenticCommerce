# Build Local APK and Deploy to Android Device/Emulator
# Usage: .\build-and-deploy-local.ps1 [-App mobile|mandate] [-Variant debug|release] [-Deploy]

param(
    [ValidateSet("mobile", "mandate")]
    [string]$App = "mobile",
    [ValidateSet("debug", "release")]
    [string]$Variant = "release",
    [switch]$Deploy
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$appConfig = @{
    "mobile"   = @{ Name = "Agentic Commerce"; Path = "apps\mobile"; PackageId = "com.agentic.commerce"; NeedsPrebuild = $true }
    "mandate"  = @{ Name = "User Mandate App"; Path = "apps\mandate-app"; PackageId = "com.agentic.mandate"; NeedsPrebuild = $false }
}

$config = $appConfig[$App]

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build & Deploy: $($config.Name)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "App: $App | Variant: $Variant | Deploy: $Deploy" -ForegroundColor Gray
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Cyan
if (Get-Command java -ErrorAction SilentlyContinue) { Write-Host "[OK] Java" -ForegroundColor Green } else { Write-Host "[X] Java not found" -ForegroundColor Red; exit 1 }
if ($env:ANDROID_HOME) { Write-Host "[OK] ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green } else { Write-Host "[!] ANDROID_HOME not set" -ForegroundColor Yellow }
try { node --version | Out-Null; Write-Host "[OK] Node.js" -ForegroundColor Green } catch { Write-Host "[X] Node.js not found" -ForegroundColor Red; exit 1 }
Write-Host ""

$appDir = Join-Path $scriptRoot $config.Path
if (-not (Test-Path $appDir)) {
    Write-Host "[X] App directory not found: $appDir" -ForegroundColor Red
    exit 1
}

Push-Location $appDir

try {
    # Install dependencies
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Cyan
        pnpm install
    }

    # Prebuild for Expo apps (mobile)
    if ($config.NeedsPrebuild -and -not (Test-Path "android")) {
        Write-Host "Running expo prebuild..." -ForegroundColor Yellow
        npx expo prebuild --platform android
        if ($LASTEXITCODE -ne 0) { throw "Prebuild failed" }
    }

    if (-not (Test-Path "android")) {
        Write-Host "[X] Android directory not found" -ForegroundColor Red
        exit 1
    }

    # Build APK
    $gradleTask = if ($Variant -eq "debug") { "assembleDebug" } else { "assembleRelease" }
    $apkSubPath = if ($Variant -eq "debug") { "debug" } else { "release" }
    $apkName = "app-$Variant.apk"
    $apkPath = "android\app\build\outputs\apk\$apkSubPath\$apkName"

        Write-Host "Building $Variant APK..." -ForegroundColor Cyan
    Push-Location android
    .\gradlew.bat $gradleTask --no-daemon
    $buildOk = $LASTEXITCODE -eq 0
    Pop-Location

    if (-not $buildOk) {
        Write-Host "[X] Build failed" -ForegroundColor Red
        exit 1
    }

    $fullApkPath = Join-Path $appDir $apkPath
    if (-not (Test-Path $fullApkPath)) {
        Write-Host "[X] APK not found at: $fullApkPath" -ForegroundColor Red
        exit 1
    }

    $apkSize = [math]::Round((Get-Item $fullApkPath).Length / 1MB, 2)
    Write-Host ""
    Write-Host "[OK] APK built successfully!" -ForegroundColor Green
    Write-Host "   Location: $fullApkPath" -ForegroundColor White
    Write-Host "   Size: $apkSize MB" -ForegroundColor Cyan
    Write-Host ""

    # Deploy to device/emulator
    if ($Deploy) {
        Write-Host "Deploying to Android device/emulator..." -ForegroundColor Cyan
        $adbPath = if ($env:ANDROID_HOME) { Join-Path $env:ANDROID_HOME "platform-tools\adb.exe" } else { "adb" }
        
        & $adbPath devices
        & $adbPath install -r $fullApkPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Installed successfully!" -ForegroundColor Green
            Write-Host "   Launching app..." -ForegroundColor Cyan
            & $adbPath shell am start -n "$($config.PackageId)/.MainActivity"
            Write-Host "[OK] App launched!" -ForegroundColor Green
        } else {
            Write-Host "[X] Install failed. Is a device/emulator connected? Run: adb devices" -ForegroundColor Red
        }
    } else {
        Write-Host "To deploy: .\build-and-deploy-local.ps1 -App $App -Variant $Variant -Deploy" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Or open in Android Studio:" -ForegroundColor Cyan
        Write-Host "   File → Open → $appDir\android" -ForegroundColor White
        Write-Host "   Connect device / start emulator → Click Run (▶️)" -ForegroundColor White
    }
}
finally {
    Pop-Location
}
