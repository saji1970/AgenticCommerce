# Script to show detailed build error
# This helps diagnose build failures

Write-Host "🔍 Diagnosing Android Build Error..." -ForegroundColor Cyan
Write-Host ""

# Navigate to mobile app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check environment
Write-Host "📋 Checking environment..." -ForegroundColor Cyan

# Check Java
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "✓ Java: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Java not found!" -ForegroundColor Red
}

# Check ANDROID_HOME
if ($env:ANDROID_HOME) {
    if (Test-Path $env:ANDROID_HOME) {
        Write-Host "✓ ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green
    } else {
        Write-Host "✗ ANDROID_HOME path not found: $env:ANDROID_HOME" -ForegroundColor Red
    }
} else {
    Write-Host "✗ ANDROID_HOME not set!" -ForegroundColor Red
}

# Check NODE_ENV
Write-Host "✓ NODE_ENV: $env:NODE_ENV" -ForegroundColor $(if ($env:NODE_ENV) { "Green" } else { "Yellow" })

Write-Host ""
Write-Host "🔨 Running build with detailed output..." -ForegroundColor Cyan
Write-Host "This will show the actual error message" -ForegroundColor Yellow
Write-Host ""

# Set NODE_ENV
$env:NODE_ENV = "production"

# Check if android directory exists
if (-not (Test-Path "android")) {
    Write-Host "❌ Android directory not found!" -ForegroundColor Red
    Write-Host "Run: npx expo prebuild --platform android" -ForegroundColor Yellow
    exit 1
}

# Run build with stacktrace
Set-Location android
Write-Host "Running: .\gradlew assembleRelease --stacktrace" -ForegroundColor Cyan
Write-Host ""
.\gradlew assembleRelease --stacktrace 2>&1 | Tee-Object -Variable buildOutput

# Show last 100 lines (usually contains the error)
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "BUILD OUTPUT (Last 100 lines - look for FAILED/Error):" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
$buildOutput | Select-Object -Last 100

Set-Location ..

