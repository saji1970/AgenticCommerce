# Mandate Service Quick Setup Guide

## Overview

The Mandate Service is now a **separate, independent service** that can be deployed independently from the shopping app. It provides:

1. ✅ **Merchant Configuration Management** - Add/manage merchants via API
2. ✅ **AI Agent App Configuration Management** - Add/manage shopping AI agents via API

## Quick Start

### 1. Install Dependencies

```bash
cd apps/mandate-service
pnpm install
```

### 2. Set Environment Variables

Create `apps/mandate-service/.env`:

```env
MANDATE_SERVICE_PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key
CORS_ORIGIN=*
BACKEND_API_URL=http://localhost:3000  # Main backend API URL (for admin endpoints)
ADMIN_TOKEN=your-admin-token  # JWT token for backend API access
PAYMENT_GATEWAY_URL=https://payment-gateway-production-db91.up.railway.app  # Payment gateway service URL
```

### 3. Run Database Migrations

```bash
# Option 1: Using psql directly
psql $DATABASE_URL -f migrations/001_create_merchants_table.sql
psql $DATABASE_URL -f migrations/002_create_ai_agent_apps_table.sql

# Option 2: Using the migration script
cd apps/mandate-service
pnpm migrate 001_create_merchants_table.sql
pnpm migrate 002_create_ai_agent_apps_table.sql
```

### 4. Start the Service

```bash
cd apps/mandate-service

# Development
pnpm dev

# Production
pnpm build
pnpm start
```

The service will run on **port 3001** (configurable via `MANDATE_SERVICE_PORT`).

## Adding a Merchant

```bash
curl -X POST http://localhost:3001/api/merchants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Amazon",
    "slug": "amazon",
    "description": "Amazon marketplace",
    "api_key": "amazon_key_123",
    "api_secret": "amazon_secret_456",
    "webhook_url": "https://amazon.com/webhook",
    "metadata": {
      "logo": "https://amazon.com/logo.png"
    }
  }'
```

## Adding an AI Agent App

```bash
curl -X POST http://localhost:3001/api/ai-agent-apps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Shopping Assistant Pro",
    "slug": "shopping-assistant-pro",
    "description": "Advanced shopping AI agent",
    "agent_id": "shopping-assistant-pro-v1",
    "agent_name": "Shopping Assistant Pro",
    "api_endpoint": "https://api.example.com/agent",
    "api_key": "agent_key_123",
    "capabilities": ["cart", "intent", "payment"],
    "metadata": {
      "version": "1.0.0"
    }
  }'
```

## API Endpoints

### Merchants
- `POST /api/merchants` - Create merchant
- `GET /api/merchants` - List all merchants
- `GET /api/merchants/:id` - Get merchant by ID
- `PUT /api/merchants/:id` - Update merchant
- `DELETE /api/merchants/:id` - Delete merchant

### AI Agent Apps
- `POST /api/ai-agent-apps` - Create agent app
- `GET /api/ai-agent-apps` - List all agent apps
- `GET /api/ai-agent-apps?active=true` - List only active apps
- `GET /api/ai-agent-apps/:id` - Get agent app by ID
- `PUT /api/ai-agent-apps/:id` - Update agent app
- `DELETE /api/ai-agent-apps/:id` - Delete agent app

## Health Check

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "service": "mandate-service"
}
```

## Integration with Shopping App

The shopping app backend can connect to the mandate service:

```typescript
const MANDATE_SERVICE_URL = process.env.MANDATE_SERVICE_URL || 'http://localhost:3001';

// Get active agent apps
const response = await fetch(`${MANDATE_SERVICE_URL}/api/ai-agent-apps?active=true`);
const { data: agentApps } = await response.json();
```

## Deployment

### Railway

1. Create a new Railway service
2. Set root directory to `apps/mandate-service`
3. Set environment variables
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
CMD ["pnpm", "start"]
```

## Next Steps

- [ ] Add authentication/authorization for configuration APIs
- [ ] Migrate mandate management from main backend to this service
- [ ] Add webhook support for merchant events
- [ ] Add health monitoring for agent apps
