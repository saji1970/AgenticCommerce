# Deploy AgenticCommerce to Android Emulator
# This script helps start an Android emulator and deploy the app

Write-Host "=== AgenticCommerce Android Emulator Deployment ===" -ForegroundColor Cyan

# Check if ANDROID_HOME is set
if (-not $env:ANDROID_HOME) {
    Write-Host "ERROR: ANDROID_HOME is not set!" -ForegroundColor Red
    Write-Host "Please set ANDROID_HOME to your Android SDK location" -ForegroundColor Yellow
    Write-Host "Example: C:\Users\YourUsername\AppData\Local\Android\Sdk" -ForegroundColor Yellow
    exit 1
}

Write-Host "Android SDK found at: $env:ANDROID_HOME" -ForegroundColor Green

# Set paths
$emulatorPath = Join-Path $env:ANDROID_HOME "emulator\emulator.exe"
$adbPath = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"

# Check if emulator exists
if (-not (Test-Path $emulatorPath)) {
    Write-Host "ERROR: Emulator not found at $emulatorPath" -ForegroundColor Red
    exit 1
}

# List available AVDs
Write-Host "`nListing available Android Virtual Devices..." -ForegroundColor Cyan
$avds = & $emulatorPath -list-avds

if (-not $avds) {
    Write-Host "ERROR: No Android Virtual Devices found!" -ForegroundColor Red
    Write-Host "`nPlease create an AVD using Android Studio:" -ForegroundColor Yellow
    Write-Host "1. Open Android Studio" -ForegroundColor Yellow
    Write-Host "2. Go to Tools > Device Manager" -ForegroundColor Yellow
    Write-Host "3. Click 'Create Device' and follow the wizard" -ForegroundColor Yellow
    exit 1
}

Write-Host "Available emulators:" -ForegroundColor Green
$avdList = @($avds)
for ($i = 0; $i -lt $avdList.Count; $i++) {
    Write-Host "  [$i] $($avdList[$i])" -ForegroundColor White
}

# Check if an emulator is already running
Write-Host "`nChecking for running emulators..." -ForegroundColor Cyan
$devices = & $adbPath devices | Select-String "emulator"

if ($devices) {
    Write-Host "Found running emulator!" -ForegroundColor Green
    Write-Host $devices -ForegroundColor White
    $useExisting = Read-Host "`nUse existing emulator? (y/n)"

    if ($useExisting -eq 'y' -or $useExisting -eq 'Y') {
        Write-Host "Using existing emulator..." -ForegroundColor Green
    } else {
        Write-Host "Starting new emulator..." -ForegroundColor Yellow
        $selection = Read-Host "Select emulator number (0-$($avdList.Count - 1))"
        $selectedAVD = $avdList[[int]$selection]

        Write-Host "Starting emulator: $selectedAVD" -ForegroundColor Cyan
        Write-Host "This will open in a new window..." -ForegroundColor Yellow
        Start-Process -FilePath $emulatorPath -ArgumentList "-avd", $selectedAVD -NoNewWindow:$false

        Write-Host "Waiting for emulator to boot (this may take 30-60 seconds)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10

        # Wait for device to be ready
        $bootComplete = $false
        $maxAttempts = 30
        $attempt = 0

        while (-not $bootComplete -and $attempt -lt $maxAttempts) {
            $attempt++
            $bootStatus = & $adbPath shell getprop sys.boot_completed 2>$null
            if ($bootStatus -eq "1") {
                $bootComplete = $true
                Write-Host "Emulator is ready!" -ForegroundColor Green
            } else {
                Write-Host "." -NoNewline
                Start-Sleep -Seconds 2
            }
        }

        if (-not $bootComplete) {
            Write-Host "`nWarning: Emulator may still be booting..." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "No running emulator found. Starting one..." -ForegroundColor Yellow

    if ($avdList.Count -eq 1) {
        $selectedAVD = $avdList[0]
        Write-Host "Using the only available emulator: $selectedAVD" -ForegroundColor Cyan
    } else {
        $selection = Read-Host "Select emulator number (0-$($avdList.Count - 1))"
        $selectedAVD = $avdList[[int]$selection]
    }

    Write-Host "Starting emulator: $selectedAVD" -ForegroundColor Cyan
    Write-Host "This will open in a new window..." -ForegroundColor Yellow
    Start-Process -FilePath $emulatorPath -ArgumentList "-avd", $selectedAVD

    Write-Host "Waiting for emulator to boot (this may take 30-60 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # Wait for device to be ready
    $bootComplete = $false
    $maxAttempts = 30
    $attempt = 0

    while (-not $bootComplete -and $attempt -lt $maxAttempts) {
        $attempt++
        $bootStatus = & $adbPath shell getprop sys.boot_completed 2>$null
        if ($bootStatus -eq "1") {
            $bootComplete = $true
            Write-Host "`nEmulator is ready!" -ForegroundColor Green
        } else {
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 2
        }
    }

    if (-not $bootComplete) {
        Write-Host "`nWarning: Emulator may still be booting. Continuing anyway..." -ForegroundColor Yellow
        Write-Host "If deployment fails, please wait and try again." -ForegroundColor Yellow
    }
}

# Navigate to mobile app directory and deploy
Write-Host "`nDeploying app to emulator..." -ForegroundColor Cyan
Set-Location -Path "apps\mobile"

Write-Host "Installing dependencies if needed..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    pnpm install
}

Write-Host "`nBuilding and deploying app..." -ForegroundColor Cyan
Write-Host "This will take a few minutes on first run..." -ForegroundColor Yellow

# Run the android command
pnpm android

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
Write-Host "The app should now be running on your emulator!" -ForegroundColor Green
