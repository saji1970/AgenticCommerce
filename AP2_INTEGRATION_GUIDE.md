# Agentic Protocol 2 (AP2) - Integration Guide

## Overview

**Agentic Protocol 2 (AP2)** is a comprehensive integration layer that enables acquirer banks and payment gateways to support AI agent-powered shopping transactions. AP2 builds on top of the Agentic Commerce Protocol (ACP) to provide:

- **Merchant Registration & API Key Management**
- **Cart Mandate Support** - AI agents can add items to shopping carts
- **Intent Mandate Support** - AI agents can express purchase intent (requires user approval)
- **Payment Mandate Support** - AI agents can execute autonomous payments
- **Webhook System** - Real-time notifications for transaction events
- **Transaction Analytics** - Comprehensive reporting and monitoring

## Architecture

```
┌─────────────────┐
│   AI Agent      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Mobile App     │◄────►│  ACP Service     │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│ AP2 Gateway API │◄────►│ Mandate Service  │◄────►│   Database      │
└────────┬────────┘      └──────────────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Webhook System  │
└─────────────────┘
```

## Database Setup

### Running the Migration

The AP2 system requires database tables for merchants, transactions, and webhooks.

**Option 1: Using psql (PostgreSQL command line)**
```bash
cd apps/backend
psql -U postgres -d agentic_commerce -f migrations/005_create_ap2_tables.sql
```

**Option 2: Using pgAdmin or another GUI**
1. Open pgAdmin and connect to your database
2. Navigate to the `agentic_commerce` database
3. Open the Query Tool
4. Copy and paste the contents of `apps/backend/migrations/005_create_ap2_tables.sql`
5. Execute the query

**Option 3: Using the Node.js migration runner (if available)**
```bash
cd apps/backend
pnpm run migrate
```

### Database Tables Created

1. **merchants** - Stores merchant registrations and API credentials
2. **ap2_transactions** - Tracks all AP2 transactions
3. **ap2_webhook_deliveries** - Manages webhook delivery attempts

## Merchant Registration

### Step 1: Register a Merchant

**Endpoint:** `POST /api/merchants/register`

**Request:**
```json
{
  "name": "My Store",
  "businessName": "My Store Inc.",
  "email": "merchant@example.com",
  "website": "https://mystore.com",
  "tier": "business",
  "webhookUrl": "https://mystore.com/webhooks/ap2"
}
```

**Response:**
```json
{
  "merchant": {
    "id": "merchant-uuid",
    "name": "My Store",
    "businessName": "My Store Inc.",
    "email": "merchant@example.com",
    "status": "pending",
    "tier": "business",
    "apiKey": "mk_test_...",
    "apiSecret": "sk_test_...",
    "webhookUrl": "https://mystore.com/webhooks/ap2",
    "webhookSecret": "whsec_...",
    "settings": { ... }
  },
  "message": "Merchant registered successfully. Please save your API credentials securely."
}
```

⚠️ **Important:** Save the `apiKey` and `apiSecret` immediately. The `apiSecret` will not be shown again!

### Step 2: Activate the Merchant

Merchants are created with `status: "pending"`. An admin must activate them:

**Endpoint:** `PUT /api/merchants/:merchantId/status`

**Headers:**
```
X-AP2-API-Key: <your-api-key>
```

**Request:**
```json
{
  "status": "active"
}
```

## Authentication

AP2 uses a two-layer authentication system:

### Layer 1: API Key Authentication

Include your API key in the request headers:

```
X-AP2-API-Key: mk_test_your_api_key_here
```

### Layer 2: HMAC Signature Verification

For all write operations, you must also include an HMAC signature:

**Headers:**
```
X-AP2-API-Key: mk_test_your_api_key_here
X-AP2-Signature: <hmac-sha256-signature>
X-AP2-Timestamp: <unix-timestamp-in-milliseconds>
```

**Signature Generation (Node.js):**
```javascript
const crypto = require('crypto');

function generateSignature(requestBody, apiSecret, timestamp) {
  const payload = `${timestamp}.${JSON.stringify(requestBody)}`;
  return crypto
    .createHmac('sha256', apiSecret)
    .update(payload)
    .digest('hex');
}

// Example usage
const timestamp = Date.now();
const requestBody = {
  mandateId: 'mandate-123',
  agentId: 'agent-456',
  // ... other fields
};

const signature = generateSignature(requestBody, 'sk_test_your_secret', timestamp);
```

## AP2 Gateway Operations

### 1. Cart Operations

AI agents can add items to a user's shopping cart.

**Endpoint:** `POST /api/ap2/gateway/cart`

**Headers:**
```
X-AP2-API-Key: mk_test_...
X-AP2-Signature: <signature>
X-AP2-Timestamp: <timestamp>
```

**Request:**
```json
{
  "userId": "user-uuid",
  "mandateId": "mandate-uuid",
  "agentId": "agent-123",
  "operation": "add",
  "productId": "product-456",
  "productName": "Wireless Headphones",
  "quantity": 1,
  "price": 99.99,
  "reasoning": "Based on your preference for high-quality audio equipment",
  "signature": "<included-in-header>",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "ap2-txn-uuid",
  "data": {
    "cartItem": {
      "id": "cart-item-uuid",
      "productId": "product-456",
      "quantity": 1,
      "price": 99.99
    }
  }
}
```

### 2. Intent Operations

AI agents can create purchase intents that require user approval.

**Endpoint:** `POST /api/ap2/gateway/intent`

**Request:**
```json
{
  "userId": "user-uuid",
  "mandateId": "intent-mandate-uuid",
  "agentId": "agent-123",
  "items": [
    {
      "productId": "product-456",
      "productName": "Wireless Headphones",
      "quantity": 1,
      "price": 99.99
    },
    {
      "productId": "product-789",
      "productName": "Phone Case",
      "quantity": 1,
      "price": 19.99
    }
  ],
  "reasoning": "Completing your audio setup with a protective case",
  "signature": "<signature>",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "ap2-txn-uuid",
  "data": {
    "intent": {
      "id": "intent-uuid",
      "status": "pending",
      "subtotal": 119.98,
      "tax": 9.60,
      "total": 129.58,
      "expiresAt": "2024-01-05T12:00:00Z"
    }
  }
}
```

### 3. Payment Operations

AI agents can execute payments for approved intents.

**Endpoint:** `POST /api/ap2/gateway/payment`

**Request:**
```json
{
  "userId": "user-uuid",
  "mandateId": "payment-mandate-uuid",
  "agentId": "agent-123",
  "intentId": "intent-uuid",
  "paymentMethod": "card",
  "amount": 129.58,
  "reasoning": "Executing approved purchase",
  "signature": "<signature>",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "ap2-txn-uuid",
  "data": {
    "payment": {
      "id": "payment-uuid",
      "status": "completed",
      "amount": 129.58,
      "transactionId": "TXN_CARD_..."
    }
  }
}
```

### 4. Mandate Verification

Verify if a mandate is valid and check remaining limits.

**Endpoint:** `POST /api/ap2/gateway/verify-mandate`

**Request:**
```json
{
  "mandateId": "mandate-uuid",
  "agentId": "agent-123",
  "operation": "payment_execute",
  "amount": 100.00,
  "signature": "<signature>",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "valid": true,
  "mandate": {
    "id": "mandate-uuid",
    "type": "payment",
    "status": "active",
    "constraints": {
      "maxTransactionAmount": 500,
      "dailySpendingLimit": 1000
    },
    "validUntil": "2024-12-31T23:59:59Z"
  },
  "remainingLimits": {
    "dailySpending": 875.50,
    "monthlySpending": 2500.00,
    "transactionsToday": 3
  }
}
```

## Webhooks

AP2 sends real-time notifications to your webhook URL for important events.

### Webhook Events

- `mandate.created`
- `mandate.approved`
- `mandate.suspended`
- `mandate.revoked`
- `intent.created`
- `intent.approved`
- `intent.rejected`
- `intent.executed`
- `payment.completed`
- `payment.failed`
- `cart.updated`

### Webhook Payload

```json
{
  "event": "payment.completed",
  "merchantId": "merchant-uuid",
  "data": {
    "transactionId": "ap2-txn-uuid",
    "payment": {
      "id": "payment-uuid",
      "amount": 129.58,
      "status": "completed"
    }
  },
  "timestamp": "2024-01-04T12:34:56Z",
  "signature": "<hmac-signature>"
}
```

### Verifying Webhook Signatures

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, webhookSecret) {
  const data = {
    event: payload.event,
    merchantId: payload.merchantId,
    data: payload.data,
    timestamp: payload.timestamp
  };

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(data))
    .digest('hex');

  return signature === expectedSignature;
}
```

### Webhook Endpoint Example

```javascript
app.post('/webhooks/ap2', (req, res) => {
  const signature = req.headers['x-ap2-signature'];
  const payload = req.body;

  if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  console.log(`Received event: ${payload.event}`);

  // Return 2xx status to acknowledge receipt
  res.status(200).json({ received: true });
});
```

## Merchant Settings

### Update Settings

**Endpoint:** `PUT /api/merchants/:merchantId/settings`

**Request:**
```json
{
  "maxTransactionAmount": 1000,
  "dailyTransactionLimit": 5000,
  "enableAutoApproval": true,
  "autoApprovalThreshold": 50,
  "notifyOnPaymentExecuted": true
}
```

### Available Settings

- `supportsCartMandate` (boolean) - Enable/disable cart operations
- `supportsIntentMandate` (boolean) - Enable/disable intent operations
- `supportsPaymentMandate` (boolean) - Enable/disable payment operations
- `maxTransactionAmount` (number) - Maximum single transaction amount
- `dailyTransactionLimit` (number) - Daily transaction volume limit
- `monthlyTransactionLimit` (number) - Monthly transaction volume limit
- `requiresWebhookVerification` (boolean) - Enforce webhook signature verification
- `requires2FA` (boolean) - Require two-factor authentication
- `enableAutoApproval` (boolean) - Auto-approve small transactions
- `autoApprovalThreshold` (number) - Auto-approve threshold amount
- `notifyOnMandateCreated` (boolean) - Send webhook for mandate events
- `notifyOnIntentCreated` (boolean) - Send webhook for intent events
- `notifyOnPaymentExecuted` (boolean) - Send webhook for payment events

## Analytics & Reporting

### Get Transactions

**Endpoint:** `GET /api/merchants/:merchantId/transactions`

**Query Parameters:**
- `status` - Filter by transaction status
- `type` - Filter by transaction type
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

### Get Analytics

**Endpoint:** `GET /api/merchants/:merchantId/analytics?period=day`

**Response:**
```json
{
  "analytics": {
    "today": {
      "totalTransactions": 125,
      "totalVolume": 15420.50,
      "completedCount": 120,
      "failedCount": 5
    },
    "thisMonth": {
      "totalTransactions": 3450,
      "totalVolume": 425600.75
    },
    "webhooks": {
      "totalWebhooks": 125,
      "delivered": 122,
      "failed": 3,
      "pending": 0,
      "successRate": 97.6
    }
  }
}
```

## Testing with Demo Merchant

A demo merchant is automatically created during migration:

```
Email: demo@merchant.com
API Key: mk_test_demo_merchant_key_12345
API Secret: sk_test_demo_merchant_secret_67890
Webhook URL: https://demo-merchant.com/webhooks/ap2
Webhook Secret: whsec_demo_webhook_secret_abcdef
Status: active
Tier: business
```

## Security Best Practices

1. **Never expose your API secret** - Store it securely on the server only
2. **Validate webhook signatures** - Always verify incoming webhooks
3. **Use HTTPS** - Never send API keys or secrets over HTTP
4. **Implement rate limiting** - Protect your endpoints from abuse
5. **Monitor transactions** - Set up alerts for suspicious activity
6. **Rotate keys regularly** - Use the key rotation endpoint periodically
7. **Check timestamp** - Reject requests older than 5 minutes (replay protection)

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_API_KEY` | API key is missing or invalid |
| `INVALID_SIGNATURE` | HMAC signature verification failed |
| `EXPIRED_REQUEST` | Request timestamp is too old |
| `MANDATE_NOT_FOUND` | Mandate does not exist |
| `MANDATE_INACTIVE` | Mandate is not active |
| `MANDATE_EXPIRED` | Mandate has expired |
| `INSUFFICIENT_PERMISSIONS` | Insufficient mandate permissions |
| `LIMIT_EXCEEDED` | Transaction or spending limit exceeded |
| `MERCHANT_SUSPENDED` | Merchant account is suspended |

## Support

For technical support or questions:
- Documentation: See this guide
- API Reference: `GET /api/ap2/gateway/docs`
- Health Check: `GET /api/ap2/gateway/health`

## Next Steps

1. ✅ Run the database migration
2. ✅ Register your merchant
3. ✅ Activate the merchant
4. ✅ Set up webhook endpoint
5. ✅ Test cart operations
6. ✅ Test intent operations
7. ✅ Test payment operations
8. ✅ Monitor analytics and webhooks
