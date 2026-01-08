# AP2 Quick Start Checklist

## ✅ Implementation Complete!

Your Agentic Protocol 2 (AP2) integration for the acquirer bank payment gateway is ready. This enables merchants to support AI agent-powered shopping with full cart, intent, and payment mandate capabilities.

## 🚀 Getting Started (5 Steps)

### Step 1: Run Database Migration ⏱️ 2 minutes

The AP2 system needs three new database tables.

**Option A: Using pgAdmin (Recommended for Windows)**
1. Open pgAdmin and connect to your PostgreSQL server
2. Navigate to the `agentic_commerce` database
3. Right-click → Query Tool
4. Open file: `apps\backend\migrations\005_create_ap2_tables.sql`
5. Click Execute (▶️ button)
6. Verify: You should see "Query returned successfully"

**Option B: Using psql (Command Line)**
```bash
cd apps/backend
psql -U postgres -d agentic_commerce -f migrations/005_create_ap2_tables.sql
```

**What this creates:**
- ✅ `merchants` table - Stores merchant registrations
- ✅ `ap2_transactions` table - Tracks all transactions
- ✅ `ap2_webhook_deliveries` table - Manages webhooks
- ✅ Demo merchant with API credentials
- ✅ Indexes and views for analytics

### Step 2: Verify Installation ⏱️ 1 minute

Check that everything compiled correctly:

```bash
# Backend type check (should show no errors)
cd apps/backend
pnpm run type-check

# Shared types build (already done)
cd ../../packages/shared-types
pnpm run build
```

### Step 3: Start the Backend Server ⏱️ 1 minute

```bash
cd apps/backend
pnpm run dev
```

You should see:
```
Server running on port 3000
Database connected successfully
```

### Step 4: Test the AP2 Gateway ⏱️ 2 minutes

**Quick Health Check:**
```bash
# Test 1: Gateway health
curl http://localhost:3000/api/ap2/gateway/health

# Expected response:
# {"status":"ok","service":"AP2 Gateway","timestamp":"..."}

# Test 2: API documentation
curl http://localhost:3000/api/ap2/gateway/docs

# Expected response: Full API documentation
```

### Step 5: Run the Full Test Suite ⏱️ 5 minutes

**First, create test mandates:**

You'll need to create mandates for testing. Here's how:

```bash
# 1. Register a test user (if you don't have one)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123!"
  }'

# Save the "token" from the response!

# 3. Create a cart mandate
curl -X POST http://localhost:3000/api/mandates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "agentId": "test-agent-001",
    "agentName": "Test Shopping Agent",
    "type": "cart",
    "constraints": {
      "maxItemValue": 500,
      "maxItemsPerDay": 10
    }
  }'

# Save the mandate ID!

# 4. Approve the mandate
curl -X POST http://localhost:3000/api/mandates/MANDATE_ID_HERE/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Then run the automated tests:**

```bash
# Set environment variables
export TEST_USER_ID=<user-id-from-registration>
export TEST_CART_MANDATE_ID=<mandate-id-from-step-3>

# Run test suite
cd apps/backend
npx ts-node src/scripts/test-ap2-integration.ts
```

## 📊 What You Now Have

### ✅ Complete AP2 Gateway
- **Cart Mandate API** - AI agents can add items to shopping carts
- **Intent Mandate API** - AI agents can create purchase intents
- **Payment Mandate API** - AI agents can execute payments
- **Authorization API** - Validate and authorize transactions
- **Verification API** - Check mandate validity and limits

### ✅ Merchant Management
- **Self-Service Registration** - Merchants can register via API
- **API Key Management** - Secure credential generation and rotation
- **Tiered Access** - Starter ($10k), Business ($50k), Enterprise ($100k)
- **Custom Settings** - Configurable limits and constraints
- **Webhook Configuration** - Real-time event notifications

### ✅ Security Infrastructure
- **HMAC Signature Verification** - SHA-256 signatures on all requests
- **Replay Protection** - 5-minute timestamp window
- **Two-Layer Auth** - API key + request signature
- **Webhook Security** - Signed webhook payloads
- **Audit Logging** - Complete transaction history

### ✅ Analytics & Monitoring
- **Real-Time Statistics** - Daily/monthly transaction volumes
- **Success Rate Tracking** - Monitor transaction success rates
- **Webhook Metrics** - Delivery success and retry statistics
- **Agent Activity Logs** - Track all agent actions
- **Spending Analytics** - Monitor spending patterns and limits

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **AP2_INTEGRATION_GUIDE.md** | Complete API documentation, authentication guide, examples |
| **AP2_README.md** | Project overview, architecture, features, quick start |
| **AP2_IMPLEMENTATION_SUMMARY.md** | Technical details, file structure, testing instructions |
| **AP2_QUICK_START.md** | This document - step-by-step setup |

## 🔑 Demo Merchant Credentials

A demo merchant is automatically created in the database:

```
Email: demo@merchant.com
API Key: mk_test_demo_merchant_key_12345
API Secret: sk_test_demo_merchant_secret_67890
Status: active
Tier: business
Webhook URL: https://demo-merchant.com/webhooks/ap2
Webhook Secret: whsec_demo_webhook_secret_abcdef
```

## 🌐 API Endpoints Reference

### Merchant Management
```
POST   /api/merchants/register              Register new merchant
GET    /api/merchants/:id                   Get merchant details
PUT    /api/merchants/:id/status            Update status
PUT    /api/merchants/:id/settings          Update settings
PUT    /api/merchants/:id/webhook           Configure webhook
POST   /api/merchants/:id/rotate-keys       Rotate API keys
GET    /api/merchants/:id/transactions      Get transaction history
GET    /api/merchants/:id/analytics         Get analytics
GET    /api/merchants/:id/webhooks          Get webhook logs
```

### AP2 Gateway Operations
```
GET    /api/ap2/gateway/health              Health check
GET    /api/ap2/gateway/docs                API documentation
POST   /api/ap2/gateway/authorize           Authorize transaction
POST   /api/ap2/gateway/verify-mandate      Verify mandate
POST   /api/ap2/gateway/cart                Cart operations
POST   /api/ap2/gateway/intent              Intent operations
POST   /api/ap2/gateway/payment             Payment operations
```

### Existing ACP Endpoints (Already Available)
```
POST   /api/mandates                        Create mandate
GET    /api/mandates                        List mandates
POST   /api/mandates/:id/approve            Approve mandate
POST   /api/acp/cart/add                    Agent add to cart
POST   /api/acp/intents                     Create intent
POST   /api/acp/payment/execute             Execute payment
```

## 🎯 Example: Complete Cart Operation Flow

```bash
# 1. Generate signature (Node.js)
const crypto = require('crypto');
const timestamp = Date.now();
const data = {
  userId: "user-uuid",
  mandateId: "cart-mandate-uuid",
  agentId: "agent-123",
  operation: "add",
  productId: "product-456",
  productName: "Wireless Headphones",
  quantity: 1,
  price: 99.99,
  reasoning: "Based on your audio preferences"
};

const signature = crypto
  .createHmac('sha256', 'sk_test_demo_merchant_secret_67890')
  .update(`${timestamp}.${JSON.stringify(data)}`)
  .digest('hex');

# 2. Make API request
curl -X POST http://localhost:3000/api/ap2/gateway/cart \
  -H "Content-Type: application/json" \
  -H "X-AP2-API-Key: mk_test_demo_merchant_key_12345" \
  -H "X-AP2-Signature: $signature" \
  -H "X-AP2-Timestamp: $timestamp" \
  -d '{
    "userId": "user-uuid",
    "mandateId": "cart-mandate-uuid",
    "agentId": "agent-123",
    "operation": "add",
    "productId": "product-456",
    "productName": "Wireless Headphones",
    "quantity": 1,
    "price": 99.99,
    "reasoning": "Based on your audio preferences",
    "signature": "",
    "timestamp": 0
  }'

# 3. Expected response
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

# 4. Webhook notification sent
{
  "event": "cart.updated",
  "merchantId": "merchant-uuid",
  "data": {
    "transactionId": "ap2-txn-uuid",
    "cartItem": {...}
  },
  "timestamp": "2024-01-04T12:00:00Z",
  "signature": "webhook-signature"
}
```

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Verify database exists
psql -U postgres -l | grep agentic_commerce

# Check connection in backend
# Look for "Database connected successfully" when starting server
```

### Migration Issues
If the migration fails:
1. Check PostgreSQL version (14+ required)
2. Ensure you're connected to the correct database
3. Check for table conflicts (drop existing AP2 tables if needed)
4. Review error messages for syntax issues

### Type Errors
```bash
# Rebuild shared packages
cd packages/shared-types
pnpm run build

# Then restart backend
cd ../../apps/backend
pnpm run dev
```

### API Errors
- **401 Unauthorized** - Check API key in X-AP2-API-Key header
- **Invalid Signature** - Verify signature generation matches timestamp
- **Expired Request** - Ensure timestamp is within 5 minutes
- **Merchant Suspended** - Check merchant status in database

## 📱 Mobile App Integration (Next Steps)

The mobile app is ready to integrate AP2 features:

1. **Mandate Management Screen**
   - Display active mandates
   - Show constraints and limits
   - Enable/disable agent access

2. **Intent Approval UI**
   - Show pending purchase intents
   - Display reasoning from agent
   - Approve/reject actions

3. **Transaction History**
   - List agent-initiated transactions
   - Show cart additions
   - Display payment history

4. **Agent Settings**
   - Configure spending limits
   - Set category restrictions
   - Manage auto-approval thresholds

## ✨ Success Indicators

You'll know it's working when:

✅ Health check returns `{"status":"ok"}`
✅ Demo merchant exists in database
✅ Type check passes with no errors
✅ Test script shows all tests passing
✅ Cart operations create transactions
✅ Webhooks are logged (even if delivery fails to demo URL)
✅ Analytics show transaction data

## 🎉 You're Ready!

Your acquirer bank payment gateway now supports AI agent-powered shopping through the Agentic Protocol 2 (AP2). Merchants can integrate this to enable:

- 🛒 **Autonomous Cart Management** - AI agents adding items based on user preferences
- 💭 **Smart Purchase Intents** - AI suggesting purchases with reasoning
- 💳 **Delegated Payments** - AI executing approved transactions

## 📞 Need Help?

- **Integration Guide**: See `AP2_INTEGRATION_GUIDE.md` for detailed API docs
- **Technical Details**: See `AP2_IMPLEMENTATION_SUMMARY.md` for architecture
- **API Reference**: `GET /api/ap2/gateway/docs`
- **Test Examples**: `apps/backend/src/scripts/test-ap2-integration.ts`

---

**Built for the future of AI-powered commerce** 🚀
