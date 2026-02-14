# Quick Deployment Script for Android Studio
# Opens both Android projects in Android Studio

Write-Host "🚀 Opening Android projects in Android Studio..." -ForegroundColor Cyan
Write-Host ""

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Find Android Studio executable
$androidStudioPaths = @(
    "$env:LOCALAPPDATA\Programs\Android\Android Studio\bin\studio64.exe",
    "$env:ProgramFiles\Android\Android Studio\bin\studio64.exe",
    "$env:ProgramFiles(x86)\Android\Android Studio\bin\studio64.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Android Studio\bin\studio64.exe"
)

$androidStudio = $null
foreach ($path in $androidStudioPaths) {
    if (Test-Path $path) {
        $androidStudio = $path
        break
    }
}

if (-not $androidStudio) {
    Write-Host "⚠️  Android Studio executable not found in common locations." -ForegroundColor Yellow
    Write-Host "   Please open Android Studio manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Agentic Commerce App:" -ForegroundColor Cyan
    Write-Host "   File → Open → $scriptRoot\apps\mobile\android" -ForegroundColor White
    Write-Host ""
    Write-Host "   User Mandate App:" -ForegroundColor Cyan
    Write-Host "   File → Open → $scriptRoot\apps\mandate-app\android" -ForegroundColor White
    Write-Host ""
    
    # Try to open folders in explorer instead
    $openFolders = Read-Host "Open project folders in Explorer? (Y/n)"
    if ($openFolders -ne "n" -and $openFolders -ne "N") {
        explorer "$scriptRoot\apps\mobile\android"
        Start-Sleep -Seconds 1
        explorer "$scriptRoot\apps\mandate-app\android"
    }
    exit 0
}

Write-Host "✓ Found Android Studio: $androidStudio" -ForegroundColor Green
Write-Host ""

# Check if projects exist
$mobileProject = Join-Path $scriptRoot "apps\mobile\android"
$mandateProject = Join-Path $scriptRoot "apps\mandate-app\android"

if (-not (Test-Path $mobileProject)) {
    Write-Host "❌ Mobile app Android project not found: $mobileProject" -ForegroundColor Red
    Write-Host "   Run: cd apps\mobile && npx expo prebuild --platform android" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $mandateProject)) {
    Write-Host "❌ Mandate app Android project not found: $mandateProject" -ForegroundColor Red
    Write-Host "   Run: cd apps\mandate-app && npx expo prebuild --platform android" -ForegroundColor Yellow
    exit 1
}

# Open projects in Android Studio
Write-Host "Opening Agentic Commerce App project..." -ForegroundColor Cyan
Start-Process $androidStudio -ArgumentList $mobileProject

Start-Sleep -Seconds 2

Write-Host "Opening User Mandate App project..." -ForegroundColor Cyan
Start-Process $androidStudio -ArgumentList $mandateProject

Write-Host ""
Write-Host "✅ Projects opened in Android Studio!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait for Gradle sync to complete" -ForegroundColor White
Write-Host "2. Connect Android device or start emulator" -ForegroundColor White
Write-Host "3. Select device from dropdown (top toolbar)" -ForegroundColor White
Write-Host "4. Click Run button (▶️) to build and deploy" -ForegroundColor White
Write-Host ""
Write-Host "Or build APK manually:" -ForegroundColor Cyan
Write-Host "   Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor White
