# PowerShell setup script for Windows

Write-Host "🚀 Setting up Agentic Commerce project..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Install root dependencies
Write-Host "📦 Installing root dependencies..." -ForegroundColor Cyan
npm install

# Install dependencies for all packages
Write-Host "📦 Installing workspace dependencies..." -ForegroundColor Cyan
npm install --workspaces

# Copy environment files
if (!(Test-Path .env)) {
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please update .env with your API keys and configuration" -ForegroundColor Yellow
}

if (!(Test-Path apps\backend\.env)) {
    Write-Host "📝 Creating backend .env file..." -ForegroundColor Yellow
    Copy-Item apps\backend\.env.example apps\backend\.env
    Write-Host "⚠️  Please update apps\backend\.env with your API keys" -ForegroundColor Yellow
}

if (!(Test-Path apps\mobile\.env)) {
    Write-Host "📝 Creating mobile .env file..." -ForegroundColor Yellow
    Copy-Item apps\mobile\.env.example apps\mobile\.env
    Write-Host "⚠️  Please update apps\mobile\.env with your API keys" -ForegroundColor Yellow
}

# Build shared packages
Write-Host "🔨 Building shared packages..." -ForegroundColor Cyan
npm run build --workspace=@agentic-commerce/shared
npm run build --workspace=@agentic-commerce/mcp-client
npm run build --workspace=@agentic-commerce/ai-agent
npm run build --workspace=@agentic-commerce/payment

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env files with your API keys:"
Write-Host "   - ANTHROPIC_API_KEY (Claude API)"
Write-Host "   - STRIPE_SECRET_KEY (Stripe)"
Write-Host "   - DATABASE_URL (PostgreSQL)"
Write-Host "   - REDIS_URL (Redis)"
Write-Host ""
Write-Host "2. Start the development servers:"
Write-Host "   npm run backend  # Start backend server"
Write-Host "   npm run mobile   # Start React Native app"
Write-Host ""
Write-Host "3. For deployment to Railway:"
Write-Host "   See DEPLOYMENT.md for detailed instructions"
Write-Host ""
