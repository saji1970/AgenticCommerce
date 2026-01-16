# Start Metro Bundler for Development Build
# This script starts the Metro bundler required for development builds

Write-Host "🚀 Starting Metro Bundler for Development Build..." -ForegroundColor Cyan
Write-Host ""

# Navigate to mobile app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if device is connected
Write-Host "📱 Checking connected devices..." -ForegroundColor Cyan
$devices = adb devices 2>&1 | Select-String -Pattern "device$"
if ($devices) {
    Write-Host "✓ Device(s) connected:" -ForegroundColor Green
    $devices | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    
    # Ask if user wants to set up port forwarding
    Write-Host ""
    $setupPortForward = Read-Host "Set up USB port forwarding (adb reverse)? (Y/n)"
    if ($setupPortForward -ne "n" -and $setupPortForward -ne "N") {
        Write-Host "Setting up port forwarding..." -ForegroundColor Cyan
        adb reverse tcp:8081 tcp:8081
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Port forwarding set up successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Port forwarding failed. Make sure device is connected via USB." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⚠️  No devices connected. Connect via USB or use emulator." -ForegroundColor Yellow
    Write-Host "   For USB: adb reverse tcp:8081 tcp:8081" -ForegroundColor Yellow
    Write-Host "   For Wi-Fi: Ensure device and computer are on the same network" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 Starting Metro bundler..." -ForegroundColor Cyan
Write-Host "   Press 'a' to open Android app" -ForegroundColor Yellow
Write-Host "   Press 'r' to reload the app" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start Metro with dev client
npx expo start --dev-client

