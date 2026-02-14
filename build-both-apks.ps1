# Unified Build Script for Both APKs
# Builds Agentic Commerce App and User Mandate App APKs

param(
    [string]$Variant = "release"  # "debug" or "release"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AgenticCommerce APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Function to check prerequisites
function Test-Prerequisites {
    Write-Host "📋 Checking prerequisites..." -ForegroundColor Cyan
    
    # Check Java
    try {
        $javaVersion = java -version 2>&1 | Select-Object -First 1
        Write-Host "✓ Java found: $javaVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Java not found. Please install JDK 17 or 21." -ForegroundColor Red
        return $false
    }
    
    # Check Android SDK
    if ($env:ANDROID_HOME) {
        Write-Host "✓ ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green
    } else {
        Write-Host "⚠️  ANDROID_HOME not set. Build may fail." -ForegroundColor Yellow
        Write-Host "   Set it to: C:\Users\$env:USERNAME\AppData\Local\Android\Sdk" -ForegroundColor Yellow
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Node.js not found." -ForegroundColor Red
        return $false
    }
    
    # Check pnpm
    try {
        $pnpmVersion = pnpm --version
        Write-Host "✓ pnpm: $pnpmVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ pnpm not found. Install with: npm install -g pnpm" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
    return $true
}

# Function to build APK
function Build-APK {
    param(
        [string]$AppName,
        [string]$AppPath,
        [string]$Variant
    )
    
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  Building $AppName" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    
    $appDir = Join-Path $scriptRoot $AppPath
    
    if (-not (Test-Path $appDir)) {
        Write-Host "❌ App directory not found: $appDir" -ForegroundColor Red
        return $false
    }
    
    Push-Location $appDir
    
    try {
        # Install dependencies if needed
        if (-not (Test-Path "node_modules")) {
            Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
            pnpm install
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
                return $false
            }
        }
        
        # Check if Android directory exists
        if (-not (Test-Path "android")) {
            Write-Host "📱 Android directory not found. Running prebuild..." -ForegroundColor Yellow
            if (Test-Path "app.json") {
                # Expo app
                npx expo prebuild --platform android
            } else {
                Write-Host "❌ Cannot determine app type. Missing android directory and app.json" -ForegroundColor Red
                return $false
            }
        }
        
        # Navigate to Android directory
        Push-Location android
        
        # Determine build variant
        if ($Variant -eq "debug") {
            $gradleTask = "assembleDebug"
            $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
        } else {
            $gradleTask = "assembleRelease"
            $apkPath = "app\build\outputs\apk\release\app-release.apk"
        }
        
        Write-Host "🔨 Building $Variant APK..." -ForegroundColor Cyan
        Write-Host "   This may take several minutes..." -ForegroundColor Yellow
        Write-Host ""
        
        # Build APK
        .\gradlew $gradleTask --no-daemon
        
        if ($LASTEXITCODE -eq 0) {
            Pop-Location
            Pop-Location
            
            $fullApkPath = Join-Path $appDir $apkPath
            
            if (Test-Path $fullApkPath) {
                $apkSize = [math]::Round((Get-Item $fullApkPath).Length / 1MB, 2)
                Write-Host "✅ $AppName build successful!" -ForegroundColor Green
                Write-Host "   Location: $fullApkPath" -ForegroundColor White
                Write-Host "   Size: $apkSize MB" -ForegroundColor Cyan
                Write-Host ""
                return $true
            } else {
                Write-Host "⚠️  Build completed but APK not found at: $fullApkPath" -ForegroundColor Yellow
                return $false
            }
        } else {
            Pop-Location
            Pop-Location
            Write-Host "❌ $AppName build failed!" -ForegroundColor Red
            return $false
        }
    } catch {
        Pop-Location
        Pop-Location
        Write-Host "❌ Error building $AppName : $_" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "Starting build process..." -ForegroundColor Cyan
Write-Host "Build variant: $Variant" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
if (-not (Test-Prerequisites)) {
    Write-Host "❌ Prerequisites check failed. Please fix the issues above." -ForegroundColor Red
    exit 1
}

# Build Agentic Commerce App
$mobileSuccess = Build-APK -AppName "Agentic Commerce App" -AppPath "apps\mobile" -Variant $Variant

Write-Host ""

# Build User Mandate App
$mandateSuccess = Build-APK -AppName "User Mandate App" -AppPath "apps\mandate-app" -Variant $Variant

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($mobileSuccess) {
    Write-Host "✅ Agentic Commerce App: SUCCESS" -ForegroundColor Green
    $mobileApk = Join-Path $scriptRoot "apps\mobile\android\app\build\outputs\apk\$Variant\app-$Variant.apk"
    Write-Host "   $mobileApk" -ForegroundColor Gray
} else {
    Write-Host "❌ Agentic Commerce App: FAILED" -ForegroundColor Red
}

if ($mandateSuccess) {
    Write-Host "✅ User Mandate App: SUCCESS" -ForegroundColor Green
    $mandateApk = Join-Path $scriptRoot "apps\mandate-app\android\app\build\outputs\apk\$Variant\app-$Variant.apk"
    Write-Host "   $mandateApk" -ForegroundColor Gray
} else {
    Write-Host "❌ User Mandate App: FAILED" -ForegroundColor Red
}

Write-Host ""

if ($mobileSuccess -and $mandateSuccess) {
    Write-Host "🎉 All APKs built successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Open Android Studio" -ForegroundColor White
    Write-Host "2. File → Open → Select android folder" -ForegroundColor White
    Write-Host "3. Connect device or start emulator" -ForegroundColor White
    Write-Host "4. Click Run button (▶️) to deploy" -ForegroundColor White
    Write-Host ""
    
    $openFolder = Read-Host "Open APK folders? (Y/n)"
    if ($openFolder -ne "n" -and $openFolder -ne "N") {
        if ($mobileSuccess) {
            $mobileFolder = Split-Path -Parent (Join-Path $scriptRoot "apps\mobile\android\app\build\outputs\apk\$Variant\app-$Variant.apk")
            explorer $mobileFolder
        }
        if ($mandateSuccess) {
            Start-Sleep -Seconds 1
            $mandateFolder = Split-Path -Parent (Join-Path $scriptRoot "apps\mandate-app\android\app\build\outputs\apk\$Variant\app-$Variant.apk")
            explorer $mandateFolder
        }
    }
    
    exit 0
} else {
    Write-Host "❌ Some builds failed. Check the errors above." -ForegroundColor Red
    exit 1
}
