# Android Build Fix Script for Agentic Commerce
# Run this if your Gradle build fails in Android Studio

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Android Build Fix Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running from correct directory
$currentDir = Get-Location
if (-not ($currentDir.Path -like "*apps\mobile\android*")) {
    Write-Host "ERROR: Please run this script from the android directory" -ForegroundColor Red
    Write-Host "Current directory: $currentDir" -ForegroundColor Yellow
    Write-Host "Expected: C:\AgenticCommerce\apps\mobile\android" -ForegroundColor Yellow
    pause
    exit 1
}

# Step 1: Check Java
Write-Host "Step 1: Checking Java..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "  ✓ Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Java not found! Please install Java 17" -ForegroundColor Red
    pause
    exit 1
}

# Step 2: Check Node
Write-Host "Step 2: Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node not found! Please install Node.js" -ForegroundColor Red
    pause
    exit 1
}

# Step 3: Check Android SDK
Write-Host "Step 3: Checking Android SDK..." -ForegroundColor Yellow
$sdkPath = "$env:USERPROFILE\AppData\Local\Android\Sdk"
if (Test-Path $sdkPath) {
    Write-Host "  ✓ Android SDK found at: $sdkPath" -ForegroundColor Green
} else {
    Write-Host "  ✗ Android SDK not found at: $sdkPath" -ForegroundColor Red
    Write-Host "    Please install Android Studio and SDK" -ForegroundColor Yellow
    pause
    exit 1
}

# Step 4: Create/Update local.properties
Write-Host "Step 4: Creating local.properties..." -ForegroundColor Yellow
$localPropsPath = "local.properties"
$sdkPathEscaped = $sdkPath.Replace('\', '\\')
"sdk.dir=$sdkPathEscaped" | Out-File -FilePath $localPropsPath -Encoding ASCII -Force
Write-Host "  ✓ Created local.properties" -ForegroundColor Green

# Step 5: Stop Gradle daemons
Write-Host "Step 5: Stopping Gradle daemons..." -ForegroundColor Yellow
try {
    .\gradlew.bat --stop 2>&1 | Out-Null
    Write-Host "  ✓ Gradle daemons stopped" -ForegroundColor Green
} catch {
    Write-Host "  ! Could not stop daemons (this is OK)" -ForegroundColor Yellow
}

# Step 6: Clean build directories
Write-Host "Step 6: Cleaning build directories..." -ForegroundColor Yellow
$dirsToClean = @("build", "app\build", ".gradle")
foreach ($dir in $dirsToClean) {
    if (Test-Path $dir) {
        Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
        Write-Host "  ✓ Cleaned: $dir" -ForegroundColor Green
    }
}

# Step 7: Clean npm (optional)
Write-Host "Step 7: Do you want to clean and reinstall npm packages? (y/n)" -ForegroundColor Yellow
$cleanNpm = Read-Host
if ($cleanNpm -eq 'y' -or $cleanNpm -eq 'Y') {
    Write-Host "  Cleaning node_modules..." -ForegroundColor Yellow
    Set-Location ..
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
    Write-Host "  Running npm install..." -ForegroundColor Yellow
    npm install
    Set-Location android
    Write-Host "  ✓ npm packages reinstalled" -ForegroundColor Green
}

# Step 8: Clean Gradle cache
Write-Host "Step 8: Cleaning Gradle..." -ForegroundColor Yellow
try {
    .\gradlew.bat clean --quiet
    Write-Host "  ✓ Gradle cleaned successfully" -ForegroundColor Green
} catch {
    Write-Host "  ! Gradle clean had warnings (this might be OK)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Fix script completed!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. Open Android Studio" -ForegroundColor White
Write-Host "2. Open this project: $currentDir" -ForegroundColor White
Write-Host "3. Wait for Gradle sync to complete" -ForegroundColor White
Write-Host "4. Click the Run button (green play icon)" -ForegroundColor White
Write-Host ""
Write-Host "If build still fails:" -ForegroundColor Yellow
Write-Host "- Check the Build tab in Android Studio for errors" -ForegroundColor White
Write-Host "- Read ANDROID_BUILD_FIX.md for more solutions" -ForegroundColor White
Write-Host ""
pause
