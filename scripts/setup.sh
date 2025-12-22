#!/bin/bash

echo "🚀 Setting up Agentic Commerce project..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install dependencies for all packages
echo "📦 Installing workspace dependencies..."
npm install --workspaces

# Copy environment files
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your API keys and configuration"
fi

if [ ! -f apps/backend/.env ]; then
    echo "📝 Creating backend .env file..."
    cp apps/backend/.env.example apps/backend/.env
    echo "⚠️  Please update apps/backend/.env with your API keys"
fi

if [ ! -f apps/mobile/.env ]; then
    echo "📝 Creating mobile .env file..."
    cp apps/mobile/.env.example apps/mobile/.env
    echo "⚠️  Please update apps/mobile/.env with your API keys"
fi

# Build shared packages
echo "🔨 Building shared packages..."
npm run build --workspace=@agentic-commerce/shared
npm run build --workspace=@agentic-commerce/mcp-client
npm run build --workspace=@agentic-commerce/ai-agent
npm run build --workspace=@agentic-commerce/payment

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env files with your API keys:"
echo "   - ANTHROPIC_API_KEY (Claude API)"
echo "   - STRIPE_SECRET_KEY (Stripe)"
echo "   - DATABASE_URL (PostgreSQL)"
echo "   - REDIS_URL (Redis)"
echo ""
echo "2. Start the development servers:"
echo "   npm run backend  # Start backend server"
echo "   npm run mobile   # Start React Native app"
echo ""
echo "3. For deployment to Railway:"
echo "   See DEPLOYMENT.md for detailed instructions"
echo ""
