# Setup Guide

This guide will help you set up the Agentic Commerce development environment.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (local or cloud instance)
- Redis (local or cloud instance)
- Anthropic API key ([Get one here](https://console.anthropic.com/))
- Stripe account ([Sign up](https://stripe.com/))

## Quick Start

### 1. Automated Setup (Recommended)

**On macOS/Linux:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**On Windows (PowerShell):**
```powershell
.\scripts\setup.ps1
```

### 2. Manual Setup

If you prefer to set up manually:

```bash
# Install root dependencies
npm install

# Install workspace dependencies
npm install --workspaces

# Copy environment files
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
# Mobile app uses Expo managed workflow - no .env file needed
# Configuration is done in apps/mobile-new/src/config/api.ts

# Build shared packages
npm run build --workspace=@agentic-commerce/shared
npm run build --workspace=@agentic-commerce/mcp-client
npm run build --workspace=@agentic-commerce/ai-agent
npm run build --workspace=@agentic-commerce/payment
```

## Configuration

### 1. Backend Configuration (`apps/backend/.env`)

Update the following environment variables:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
DATABASE_URL=postgresql://user:pass@localhost:5432/agentic_commerce
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secure-random-secret-key

# Optional
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

### 2. Mobile App Configuration

The mobile app uses Expo managed workflow. Update the API URL in `apps/mobile-new/src/config/api.ts`:

```typescript
const RAILWAY_API_URL = 'http://localhost:3000/api/v1'; // or your production URL
```

## Database Setup

### Using Docker (Recommended for Development)

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# The connection strings will be:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentic_commerce
# REDIS_URL=redis://localhost:6379
```

### Using Cloud Services

**PostgreSQL:**
- [Supabase](https://supabase.com/) (Free tier available)
- [Neon](https://neon.tech/) (Free tier available)
- [Railway](https://railway.app/) (Integrated with deployment)

**Redis:**
- [Upstash](https://upstash.com/) (Free tier available)
- [Redis Cloud](https://redis.com/cloud/) (Free tier available)
- [Railway](https://railway.app/) (Integrated with deployment)

## Getting API Keys

### 1. Anthropic Claude API

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key to `ANTHROPIC_API_KEY` in your .env file

### 2. Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Sign up or log in
3. Get your test API keys from the Developers section
4. Copy both secret and publishable keys to your .env files

## Running the Project

### Development Mode

**Terminal 1 - Backend:**
```bash
npm run backend
```

**Terminal 2 - Mobile App:**
```bash
npm run mobile
```

The backend will run on `http://localhost:3000` and the mobile app will open in Expo.

### Testing the Backend

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":...}
```

### Testing the Mobile App

1. Install Expo Go on your phone:
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code shown in the terminal

3. The app should load on your device

## Project Structure

```
agentic-commerce/
├── apps/
│   ├── backend/          # Node.js/Express backend
│   ├── mobile-new/       # React Native app
│   └── vr/               # AR/VR app (Phase 3)
├── packages/
│   ├── shared/           # Shared types and utilities
│   ├── ai-agent/         # Claude AI integration
│   ├── mcp-client/       # MCP protocol client
│   └── payment/          # Stripe payment service
├── scripts/              # Setup and utility scripts
└── infrastructure/       # Deployment configs
```

## Common Issues

### Port Already in Use

If port 3000 is already in use:

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or change the port in apps/backend/.env
PORT=3001
```

### Database Connection Failed

1. Verify PostgreSQL is running
2. Check DATABASE_URL format: `postgresql://user:password@host:port/database`
3. Test connection: `psql $DATABASE_URL`

### Redis Connection Failed

1. Verify Redis is running
2. Check REDIS_URL format: `redis://host:port`
3. Test connection: `redis-cli ping`

### Module Not Found Errors

```bash
# Clean and reinstall
npm run clean
npm install
npm install --workspaces
npm run build
```

## Next Steps

1. ✅ Complete environment configuration
2. ✅ Verify backend is running
3. ✅ Test mobile app on device/simulator
4. 📖 Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
5. 📖 Explore the [API documentation](./API.md) (coming soon)

## Getting Help

- Check existing [GitHub Issues](https://github.com/your-org/agentic-commerce/issues)
- Read the [Technical Specification](./technical-specification.md)
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for Railway deployment

## Development Tips

### Hot Reload

- Backend: Uses `tsx watch` for automatic restarts
- Mobile: Expo provides fast refresh automatically

### Debugging

**Backend:**
```bash
# Enable debug logging
LOG_LEVEL=debug npm run backend
```

**Mobile:**
- Shake device to open developer menu
- Enable Remote JS Debugging
- Use React DevTools

### Testing

```bash
# Run all tests
npm test

# Run specific package tests
npm test --workspace=@agentic-commerce/backend
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

Happy coding! 🚀
