# Mandate Service

A separate, independent service for managing mandates, merchants, and AI agent applications.

## Overview

The Mandate Service is deployed independently from the shopping app backend. It provides:

1. **Merchant Configuration Management** - Add and manage merchants through configuration
2. **AI Agent App Configuration Management** - Add and manage shopping AI agent applications
3. **Mandate Management** - Core mandate functionality (to be migrated from main backend)

## Architecture

```
apps/
├── backend/          # Shopping app backend (products, cart, payments)
├── mandate-service/  # Independent mandate service
└── mobile/           # Mobile app
```

## Setup

### 1. Install Dependencies

```bash
cd apps/mandate-service
pnpm install
```

### 2. Environment Variables

Create a `.env` file:

```env
# Server
MANDATE_SERVICE_PORT=3001
NODE_ENV=development

# Database (shared with main backend)
DATABASE_URL=postgresql://user:password@host:port/database

# JWT (if needed for authentication)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*
```

### 3. Run Migrations

```bash
# Run merchant table migration
psql $DATABASE_URL -f migrations/001_create_merchants_table.sql

# Run AI agent apps table migration
psql $DATABASE_URL -f migrations/002_create_ai_agent_apps_table.sql
```

### 4. Start the Service

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## API Endpoints

### Merchants

#### Create Merchant
```http
POST /api/merchants
Content-Type: application/json

{
  "name": "Amazon",
  "slug": "amazon",
  "description": "Amazon marketplace",
  "api_key": "amazon_api_key_123",
  "api_secret": "amazon_secret_456",
  "webhook_url": "https://amazon.com/webhook",
  "metadata": {
    "logo": "https://amazon.com/logo.png",
    "contact": "support@amazon.com"
  }
}
```

#### Get All Merchants
```http
GET /api/merchants
```

#### Get Merchant by ID
```http
GET /api/merchants/:id
```

#### Update Merchant
```http
PUT /api/merchants/:id
Content-Type: application/json

{
  "name": "Amazon Updated",
  "status": "active",
  "metadata": { ... }
}
```

#### Delete Merchant
```http
DELETE /api/merchants/:id
```

### AI Agent Apps

#### Create AI Agent App
```http
POST /api/ai-agent-apps
Content-Type: application/json

{
  "name": "Shopping Assistant Pro",
  "slug": "shopping-assistant-pro",
  "description": "Advanced shopping AI agent",
  "agent_id": "shopping-assistant-pro-v1",
  "agent_name": "Shopping Assistant Pro",
  "api_endpoint": "https://api.example.com/agent",
  "api_key": "agent_api_key_123",
  "capabilities": ["cart", "intent", "payment"],
  "metadata": {
    "version": "1.0.0",
    "icon": "https://example.com/icon.png"
  }
}
```

#### Get All Agent Apps
```http
GET /api/ai-agent-apps
GET /api/ai-agent-apps?active=true  # Only active apps
```

#### Get Agent App by ID
```http
GET /api/ai-agent-apps/:id
```

#### Update Agent App
```http
PUT /api/ai-agent-apps/:id
Content-Type: application/json

{
  "name": "Shopping Assistant Pro v2",
  "status": "active",
  "capabilities": ["cart", "intent", "payment", "recommendations"]
}
```

#### Delete Agent App
```http
DELETE /api/ai-agent-apps/:id
```

## Configuration Management

### Adding a New Merchant

1. Use the API to create a merchant:
```bash
curl -X POST http://localhost:3001/api/merchants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Merchant",
    "slug": "new-merchant",
    "api_key": "merchant_key",
    "api_secret": "merchant_secret"
  }'
```

2. The merchant will be available for use in the shopping app

### Adding a New AI Agent App

1. Use the API to create an agent app:
```bash
curl -X POST http://localhost:3001/api/ai-agent-apps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Shopping Agent",
    "slug": "my-shopping-agent",
    "agent_id": "my-agent-v1",
    "agent_name": "My Shopping Agent",
    "capabilities": ["cart", "intent"]
  }'
```

2. The agent app will be available for use in mandates

## Integration with Shopping App

The shopping app backend should connect to the mandate service via HTTP:

```typescript
// In shopping app backend
const MANDATE_SERVICE_URL = process.env.MANDATE_SERVICE_URL || 'http://localhost:3001';

// Get active agent apps
const response = await fetch(`${MANDATE_SERVICE_URL}/api/ai-agent-apps?active=true`);
const { data: agentApps } = await response.json();
```

## Deployment

### Railway

1. Create a new Railway service for the mandate service
2. Set environment variables
3. Deploy from the `apps/mandate-service` directory

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

## Future Enhancements

- [ ] Migrate mandate management from main backend
- [ ] Add authentication/authorization for configuration APIs
- [ ] Add webhook support for merchant events
- [ ] Add agent app health monitoring
- [ ] Add configuration validation
- [ ] Add audit logging for configuration changes
