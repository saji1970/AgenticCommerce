# Agentic Protocol 2 (AP2) - Acquirer Bank Payment Gateway Integration

## Overview

**AP2 (Agentic Protocol 2)** is a comprehensive payment gateway integration layer that enables acquirer banks and merchants to support AI agent-powered shopping transactions through the Agentic Commerce Protocol (ACP).

## What is AP2?

AP2 provides a standardized API layer that sits between:
- **Merchants/Storefronts** - Your e-commerce platform
- **Acquirer Banks/Payment Gateways** - Financial institutions processing payments
- **AI Shopping Agents** - Autonomous agents making purchases on behalf of users
- **End Users** - Customers who grant mandates to agents

## Key Features

### 1. Three-Tier Mandate System

#### Cart Mandate
- AI agents can add/update/remove items from shopping carts
- Constraints: max item value, category restrictions, daily limits
- No user approval required for cart operations

#### Intent Mandate
- AI agents can express purchase intent
- Requires user approval before execution
- Auto-approval available for transactions under threshold
- Time-limited intents (default 24 hours)

#### Payment Mandate
- AI agents can execute autonomous payments
- Strict spending limits (daily/monthly)
- Transaction amount caps
- Payment method restrictions
- Optional 2FA requirement

### 2. Merchant Management

- **Registration System** - Self-service merchant onboarding
- **API Key Management** - Secure credential generation and rotation
- **Tiered Access** - Starter, Business, Enterprise tiers with different limits
- **Settings Configuration** - Customizable constraints and preferences

### 3. Security Features

- **HMAC Signature Verification** - All requests signed with SHA-256
- **Replay Protection** - Timestamp-based request validation (5-minute window)
- **API Key Authentication** - Two-layer auth (API key + signature)
- **Webhook Security** - Signed webhook payloads
- **Audit Logging** - Complete transaction history

### 4. Real-Time Webhooks

- Event-driven notifications for:
  - Mandate lifecycle events
  - Purchase intent updates
  - Payment completions/failures
  - Cart modifications
- Automatic retry with exponential backoff
- Delivery tracking and monitoring

### 5. Analytics & Reporting

- Real-time transaction statistics
- Daily/monthly volume tracking
- Success rate monitoring
- Webhook delivery metrics
- Agent activity logging

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Shopping Agent                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile Shopping App                           │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  Cart Context  │  │ Mandate Screen │  │ Checkout Screen  │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API Server                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Agentic Commerce Protocol (ACP)             │   │
│  │  • Mandate Service                                       │   │
│  │  • Purchase Intent Service                               │   │
│  │  • Agent Action Logging                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │          Agentic Protocol 2 (AP2) Gateway Layer          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │   AP2 Auth   │  │ AP2 Gateway  │  │  AP2 Webhook │  │   │
│  │  │  Middleware  │  │   Service    │  │   Service    │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                         │
│  • users                    • mandates                           │
│  • products                 • purchase_intents                   │
│  • merchants                • agent_action_logs                  │
│  • ap2_transactions         • ap2_webhook_deliveries             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Payment Gateway / Bank                        │
│  • Transaction Processing                                        │
│  • Settlement                                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Files Created

### Type Definitions
- `packages/shared-types/src/ap2.types.ts` - Complete AP2 type definitions

### Database
- `apps/backend/migrations/005_create_ap2_tables.sql` - Database schema

### Repositories
- `apps/backend/src/repositories/merchant.repository.ts`
- `apps/backend/src/repositories/ap2-transaction.repository.ts`
- `apps/backend/src/repositories/ap2-webhook.repository.ts`

### Services
- `apps/backend/src/services/ap2-gateway.service.ts` - Core gateway logic
- `apps/backend/src/services/ap2-webhook.service.ts` - Webhook management

### Controllers
- `apps/backend/src/controllers/merchant.controller.ts`
- `apps/backend/src/controllers/ap2-gateway.controller.ts`

### Middleware
- `apps/backend/src/middleware/ap2-auth.middleware.ts` - Authentication & signature verification

### Routes
- `apps/backend/src/routes/merchant.routes.ts`
- `apps/backend/src/routes/ap2-gateway.routes.ts`

### Documentation & Testing
- `AP2_INTEGRATION_GUIDE.md` - Complete integration guide
- `apps/backend/src/scripts/test-ap2-integration.ts` - Test/demo script

## API Endpoints

### Merchant Management
```
POST   /api/merchants/register              - Register new merchant
GET    /api/merchants/:id                   - Get merchant details
PUT    /api/merchants/:id/status            - Update merchant status
PUT    /api/merchants/:id/settings          - Update settings
PUT    /api/merchants/:id/webhook           - Configure webhook
POST   /api/merchants/:id/rotate-keys       - Rotate API keys
GET    /api/merchants/:id/transactions      - Get transactions
GET    /api/merchants/:id/analytics         - Get analytics
GET    /api/merchants/:id/webhooks          - Get webhook logs
```

### AP2 Gateway
```
GET    /api/ap2/gateway/health              - Health check
GET    /api/ap2/gateway/docs                - API documentation
POST   /api/ap2/gateway/authorize           - Authorize transaction
POST   /api/ap2/gateway/verify-mandate      - Verify mandate
POST   /api/ap2/gateway/cart                - Cart operations
POST   /api/ap2/gateway/intent              - Intent operations
POST   /api/ap2/gateway/payment             - Payment operations
```

## Quick Start

### 1. Run Database Migration

```bash
# Using psql
cd apps/backend
psql -U postgres -d agentic_commerce -f migrations/005_create_ap2_tables.sql

# Or use pgAdmin to run the SQL file
```

### 2. Build Shared Packages

```bash
cd packages/shared-types
pnpm run build
```

### 3. Start the Backend

```bash
cd apps/backend
pnpm run dev
```

### 4. Register a Merchant

```bash
curl -X POST http://localhost:3000/api/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Store",
    "businessName": "My Store Inc.",
    "email": "merchant@example.com",
    "tier": "business",
    "webhookUrl": "https://mystore.com/webhooks/ap2"
  }'
```

### 5. Test the Integration

```bash
cd apps/backend
npx ts-node src/scripts/test-ap2-integration.ts
```

## Environment Variables

For testing, set these environment variables:

```bash
export API_URL=http://localhost:3000/api
export TEST_USER_ID=your-user-uuid
export TEST_CART_MANDATE_ID=your-cart-mandate-uuid
export TEST_INTENT_MANDATE_ID=your-intent-mandate-uuid
export TEST_PAYMENT_MANDATE_ID=your-payment-mandate-uuid
```

## Demo Merchant

A demo merchant is automatically created:

```
Email: demo@merchant.com
API Key: mk_test_demo_merchant_key_12345
API Secret: sk_test_demo_merchant_secret_67890
Status: active
Tier: business
```

## Security Considerations

1. **API Secrets** - Never commit API secrets to version control
2. **HTTPS Only** - Always use HTTPS in production
3. **Signature Verification** - Always verify request signatures
4. **Webhook Security** - Verify webhook signatures before processing
5. **Rate Limiting** - Implement rate limiting on all endpoints
6. **Monitoring** - Monitor for suspicious transaction patterns

## Merchant Tiers

### Starter
- Max Transaction: $10,000
- Daily Limit: $100,000
- Monthly Limit: $1,000,000

### Business
- Max Transaction: $50,000
- Daily Limit: $500,000
- Monthly Limit: $5,000,000

### Enterprise
- Max Transaction: $100,000
- Daily Limit: $1,000,000
- Monthly Limit: $10,000,000
- Custom limits available

## Webhook Retry Logic

Failed webhooks are automatically retried with exponential backoff:

1. Immediate attempt
2. Retry after 2 minutes
3. Retry after 4 minutes
4. Retry after 8 minutes
5. Retry after 16 minutes
6. Marked as failed after 5 attempts

## Transaction Lifecycle

### Cart Mandate
1. Agent requests cart operation
2. AP2 validates mandate & constraints
3. Item added to cart
4. Webhook sent to merchant
5. Transaction logged

### Intent Mandate
1. Agent creates purchase intent
2. AP2 validates mandate & constraints
3. Intent created (pending status)
4. Auto-approval check
5. User approves/rejects (if not auto-approved)
6. Webhook sent on status change

### Payment Mandate
1. Agent requests payment execution
2. AP2 validates mandate & spending limits
3. Intent must be approved
4. Payment processed through gateway
5. Transaction completed
6. Webhook sent on completion

## Support & Documentation

- Full Integration Guide: `AP2_INTEGRATION_GUIDE.md`
- API Reference: `GET /api/ap2/gateway/docs`
- Test Script: `src/scripts/test-ap2-integration.ts`

## Next Steps

1. ✅ Complete database setup
2. ✅ Configure environment variables
3. ✅ Register your merchant
4. ✅ Create test mandates
5. ✅ Test cart operations
6. ✅ Test intent operations
7. ✅ Test payment operations
8. ✅ Set up webhook endpoint
9. ✅ Monitor analytics
10. ✅ Go live!

---

**Built with ❤️ for the future of AI-powered commerce**
