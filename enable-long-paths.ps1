# Enable Windows Long Paths Support
# Run this script as Administrator

Write-Host "Enabling Windows Long Paths..." -ForegroundColor Cyan

# Enable long paths in registry
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
    -Name "LongPathsEnabled" `
    -Value 1 `
    -PropertyType DWORD `
    -Force | Out-Null

# Enable long paths for Git
git config --system core.longpaths true

Write-Host "✓ Windows Long Paths enabled!" -ForegroundColor Green
Write-Host "✓ Git long paths enabled!" -ForegroundColor Green
Write-Host ""
Write-Host "No restart required. You can now build the Android app." -ForegroundColor Yellow
Write-Host ""

# Verify
$longPathsEnabled = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" | Select-Object -ExpandProperty LongPathsEnabled
if ($longPathsEnabled -eq 1) {
    Write-Host "Verification: Long paths are now ENABLED" -ForegroundColor Green
} else {
    Write-Host "Verification: FAILED - Please run as Administrator" -ForegroundColor Red
}
