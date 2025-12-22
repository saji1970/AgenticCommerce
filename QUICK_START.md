# Quick Start Guide - 15 Minutes to Running App

This guide will get you from zero to running app in 15 minutes.

## Prerequisites

- Node.js 18+ installed
- A code editor (VS Code recommended)
- A terminal

## Step 1: Get API Keys (5 minutes)

You need only **2 API keys** to start:

### 1. Anthropic Claude API (Required)

**Cost:** $5 free credit for new users

1. Go to https://console.anthropic.com/
2. Sign up for an account
3. Navigate to "API Keys"
4. Click "Create Key"
5. Copy your key (starts with `sk-ant-`)

### 2. RapidAPI for Product Search (Required)

**Cost:** FREE for 100 searches/month

1. Go to https://rapidapi.com/
2. Sign up for a free account
3. Search for "Real-Time Product Search API"
4. Subscribe to FREE plan (no credit card needed)
5. Copy your API key

**Alternative:** Use SerpAPI (https://serpapi.com/) - also has free tier

## Step 2: Install Dependencies (3 minutes)

```bash
# Clone or navigate to project
cd AgenticCommerce

# Run setup script (Windows PowerShell)
.\scripts\setup.ps1

# Or manually install
npm install
npm install --workspaces
```

## Step 3: Configure Environment (2 minutes)

Create `.env` file in project root:

```bash
# Copy example file
cp .env.example .env
```

Edit `.env` and add your API keys:

```bash
# AI Agent
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Product Search
PRODUCT_DATA_SOURCE=rapidapi
RAPIDAPI_KEY=your-rapidapi-key-here

# Payment (Optional for now - use test mode)
PAYMENT_GATEWAY=stripe
PAYMENT_API_KEY=sk_test_placeholder

# Database (Use Docker - see below)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentic_commerce
REDIS_URL=redis://localhost:6379

# JWT Secret (any random string)
JWT_SECRET=your-random-secret-key-here-change-in-production
```

## Step 4: Start Database (2 minutes)

Using Docker (easiest):

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify they're running
docker ps
```

**Don't have Docker?** Use free cloud databases:
- PostgreSQL: https://supabase.com (free tier)
- Redis: https://upstash.com (free tier)

Then update `DATABASE_URL` and `REDIS_URL` in `.env`

## Step 5: Build Packages (2 minutes)

```bash
# Build shared packages
npm run build --workspace=@agentic-commerce/shared
npm run build --workspace=@agentic-commerce/product-search
npm run build --workspace=@agentic-commerce/ai-agent
npm run build --workspace=@agentic-commerce/payment
```

## Step 6: Start Backend (1 minute)

```bash
# Terminal 1 - Start backend API
cd apps/backend
npm run dev
```

You should see:
```
🚀 Agentic Commerce Backend running on port 3000
```

Test it: http://localhost:3000/health

## Step 7: Start Mobile App (Optional - 2 minutes)

```bash
# Terminal 2 - Start mobile app
cd apps/mobile
npm start
```

Scan QR code with Expo Go app on your phone:
- iOS: https://apps.apple.com/app/expo-go/id982107779
- Android: https://play.google.com/store/apps/details?id=host.exp.exponent

## Testing the API

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-21T...",
  "uptime": 5.123
}
```

### Test 2: Product Search

```bash
curl http://localhost:3000/api/v1/products/search?query=laptop
```

You should see product results from RapidAPI!

### Test 3: AI Agent Chat

First, create an account (or use test credentials):

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Copy the `token` from response, then chat with agent:

```bash
curl -X POST http://localhost:3000/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "message": "Find me a laptop under $1000"
  }'
```

## Troubleshooting

### "Cannot connect to database"
- Verify Docker is running: `docker ps`
- Or update `.env` with cloud database URLs

### "ANTHROPIC_API_KEY not configured"
- Make sure you added the key to `.env`
- Restart the backend: Ctrl+C and `npm run dev` again

### "Module not found"
- Run: `npm install` in project root
- Run: `npm install --workspaces`
- Rebuild packages: `npm run build` in each package

### Port 3000 already in use
- Change PORT in `apps/backend/.env`
- Or kill process: `npx kill-port 3000`

## Next Steps

Now that you're running:

1. **Add Payment Gateway** (Optional)
   - Get Stripe test keys: https://stripe.com
   - Add to `.env`: `PAYMENT_API_KEY=sk_test_...`

2. **Explore the Code**
   - Backend API: `apps/backend/src/`
   - Mobile App: `apps/mobile/src/`
   - AI Agent: `packages/ai-agent/src/`

3. **Read Documentation**
   - [MCP_INTEGRATION.md](./MCP_INTEGRATION.md) - Product search options
   - [PAYMENT_GATEWAYS.md](./PAYMENT_GATEWAYS.md) - Payment setup
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy to Railway

4. **Deploy to Production**
   - Follow [DEPLOYMENT.md](./DEPLOYMENT.md)
   - Deploy to Railway in 5 minutes

## Free Tier Limits

With free tiers, you can:
- **Anthropic**: 5,000+ AI messages ($5 credit)
- **RapidAPI**: 100 product searches/month
- **Supabase**: PostgreSQL database (500MB)
- **Upstash**: Redis cache (10,000 commands/day)
- **Railway**: 500 hours/month hosting

**Total Cost for MVP**: $0-5/month

## Support

- Check [SETUP.md](./SETUP.md) for detailed setup
- Review [MCP_INTEGRATION.md](./MCP_INTEGRATION.md) for product search
- Open an issue on GitHub

---

**Congratulations!** 🎉 You now have a working AI-powered shopping app!

Next: Try asking the AI agent to find products for you through the mobile app or API.
