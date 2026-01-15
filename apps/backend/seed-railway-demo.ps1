# Seed Demo Data to Railway Database
# This script seeds all demo queries, products, mandates, and intents to Railway

Write-Host "Seeding Demo Data to Railway Database" -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is already set
if ($env:DATABASE_URL) {
    Write-Host "DATABASE_URL found in environment" -ForegroundColor Green
    $preview = $env:DATABASE_URL.Substring(0, [Math]::Min(30, $env:DATABASE_URL.Length))
    Write-Host "Using: $preview..." -ForegroundColor Gray
} else {
    Write-Host "DATABASE_URL not found in environment" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Use Railway CLI (if logged in):" -ForegroundColor Cyan
    Write-Host "   railway variables --json | ConvertFrom-Json | Where-Object { `$_.name -eq 'DATABASE_URL' } | Select-Object -ExpandProperty value" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Get DATABASE_URL from Railway Dashboard:" -ForegroundColor Cyan
    Write-Host "   1. Go to https://railway.app" -ForegroundColor Gray
    Write-Host "   2. Select your project" -ForegroundColor Gray
    Write-Host "   3. Go to Variables tab" -ForegroundColor Gray
    Write-Host "   4. Copy the DATABASE_URL value" -ForegroundColor Gray
    Write-Host "   5. Set it: `$env:DATABASE_URL = 'your-database-url'" -ForegroundColor Gray
    Write-Host ""
    
    # Try to get from Railway CLI
    Write-Host "Attempting to get DATABASE_URL from Railway CLI..." -ForegroundColor Cyan
    try {
        $railwayVars = railway variables --json 2>&1
        if ($LASTEXITCODE -eq 0) {
            $vars = $railwayVars | ConvertFrom-Json
            $dbUrl = ($vars | Where-Object { $_.name -eq 'DATABASE_URL' } | Select-Object -First 1).value
            if ($dbUrl) {
                $env:DATABASE_URL = $dbUrl
                Write-Host "Got DATABASE_URL from Railway CLI" -ForegroundColor Green
            } else {
                Write-Host "DATABASE_URL not found in Railway variables" -ForegroundColor Red
                Write-Host ""
                Write-Host "Please set DATABASE_URL manually:" -ForegroundColor Yellow
                Write-Host '   $env:DATABASE_URL = "postgresql://user:password@host:port/database"' -ForegroundColor Gray
                exit 1
            }
        } else {
            Write-Host "Railway CLI not authenticated or not linked" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please either:" -ForegroundColor Yellow
            Write-Host "   1. Login: railway login" -ForegroundColor Gray
            Write-Host "   2. Link project: railway link" -ForegroundColor Gray
            Write-Host "   3. Or set DATABASE_URL manually (see instructions above)" -ForegroundColor Gray
            exit 1
        }
    } catch {
        Write-Host "Failed to get DATABASE_URL from Railway CLI" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Please set DATABASE_URL manually (see instructions above)" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "Running seed script..." -ForegroundColor Cyan
Write-Host ""

# Run the seed script
pnpm seed:demo

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Demo data seeded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Demo queries are now available:" -ForegroundColor Cyan
    Write-Host "   - Product Search: ergonomic chair, wireless headphones, laptop under 1000, etc." -ForegroundColor Gray
    Write-Host "   - Intent Search: MacBook Pro, Sony headphones, iPad Air, etc." -ForegroundColor Gray
    Write-Host ""
    Write-Host "See DEMO_QUERIES_GUIDE.md for the complete list." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Seed script failed. Check the error above." -ForegroundColor Red
    exit 1
}

