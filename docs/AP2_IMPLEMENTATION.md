# Google AP2 (Agent Payments Protocol) Implementation

This document describes the AP2 implementation in Agentic Commerce.

## Overview

AP2 is an open protocol developed by Google with 60+ payment and technology companies to securely initiate and transact agent-led payments across platforms. Our implementation provides:

- **Intent Mandates**: Cryptographically signed contracts authorizing the AI agent to search for products
- **Cart Mandates**: Signed contracts locking in exact purchase details before payment
- **Secure Payment Processing**: AP2-compliant payment flow with mandate verification
- **Full Audit Trail**: Complete tracking of all mandate operations
- **Mobile Support**: React Native implementation with biometric authentication

## Architecture

```
Mobile App (React Native)
    ↓ Creates & Signs Mandates
    ↓ Biometric Authentication
    ↓
Backend API (Express.js)
    ↓ Validates & Stores Mandates
    ↓ Processes Payments
    ↓
Payment Provider (Stripe, PayPal, etc.)
    ↓ Executes Transaction
    ↓
Database (PostgreSQL)
    ↓ Audit Trail
```

## Key Components

### 1. Shared Types (`packages/shared/src/types/ap2.types.ts`)

Defines all AP2 type definitions:
- `IntentMandate`
- `CartMandate`
- `SignedMandate<T>`
- `MandateVerificationResult`
- `AP2TransactionResult`

### 2. Mandate Manager (`packages/ap2-mandate/`)

Core mandate management functionality:
- `MandateManager` - Creates, signs, and verifies mandates
- `MandateAuditLogger` - Logs all mandate operations
- `PostgresAuditStore` - Database storage for audit events

### 3. AI Agent Integration (`packages/ai-agent/`)

Extended `ShoppingAgent` class with AP2 methods:
- `createIntentMandate()` - Creates Intent Mandate for shopping requests
- `createCartMandate()` - Creates Cart Mandate for purchases
- `verifyMandate()` - Validates mandate signatures
- `revokeIntentMandate()` - Cancels active mandates

### 4. Payment Service (`packages/payment/`)

AP2 payment processing:
- `processAP2Payment()` - Processes payment with Cart Mandate
- `createAP2Authorization()` - Creates payment authorization

### 5. Backend API (`apps/backend/`)

REST API endpoints for mandate management:

#### Intent Mandate Endpoints
- `POST /api/v1/mandates/intent` - Create Intent Mandate
- `GET /api/v1/mandates/intent/:mandateId` - Get Intent Mandate

#### Cart Mandate Endpoints
- `POST /api/v1/mandates/cart` - Create Cart Mandate

#### Payment Processing
- `POST /api/v1/mandates/process-payment` - Process AP2 payment

#### Mandate Management
- `GET /api/v1/mandates/user` - Get user's mandates
- `POST /api/v1/mandates/:mandateId/revoke` - Revoke mandate
- `GET /api/v1/mandates/:mandateId/audit` - Get audit trail

### 6. Mobile App (`apps/mobile-new/`)

React Native implementation:
- `AP2MandateManager` - Mobile mandate creation and signing
- `AP2ApiService` - API communication
- `useAP2Mandates` - React hook for mandate operations

## Usage Examples

### Backend: Creating an Intent Mandate

```typescript
import { ShoppingAgent } from '@agentic-commerce/ai-agent';
import { MandateManager } from '@agentic-commerce/ap2-mandate';

const mandateManager = new MandateManager();
const agent = new ShoppingAgent(config, mcpClient, mandateManager);

// Create Intent Mandate for a shopping request
const intentMandate = await agent.createIntentMandate(
  'user_123',
  'Find wireless headphones under $200',
  {
    budget: 200,
    category: 'electronics',
    preferredRetailers: ['amazon', 'bestbuy'],
  }
);

console.log('Intent Mandate ID:', intentMandate.mandate.mandate_id);
```

### Backend: Creating a Cart Mandate and Processing Payment

```typescript
// User selects products
const selectedProducts = [
  {
    id: 'prod_123',
    name: 'Sony WH-1000XM5',
    price: 179.99,
    sku: 'SONY-WH1000XM5',
  },
];

// Create Cart Mandate
const cartMandate = await agent.createCartMandate(
  'user_123',
  selectedProducts,
  { id: 'amazon', name: 'Amazon' },
  'pm_card_visa_1234',
  shippingAddress
);

// Process payment through AP2
const result = await paymentService.processAP2Payment(
  cartMandate,
  'pm_card_visa_1234'
);

if (result.status === 'success') {
  console.log('Payment successful!', result.transaction_id);
}
```

### Mobile: Using the React Hook

```typescript
import { useAP2Mandates } from '../hooks/useAP2Mandates';

function ShoppingScreen() {
  const {
    currentIntentMandate,
    isCreatingIntent,
    createIntentMandate,
    createCartMandate,
    processPayment,
    error,
  } = useAP2Mandates();

  const handleSearch = async () => {
    // Step 1: Create Intent Mandate
    const intentMandate = await createIntentMandate(
      'Find running shoes under $150',
      150,
      {
        categories: ['shoes', 'sports'],
        approvedMerchants: ['nike', 'adidas'],
      }
    );

    if (intentMandate) {
      console.log('Intent Mandate created:', intentMandate.mandate.mandate_id);
      // Proceed with product search
    }
  };

  const handlePurchase = async (selectedProducts: any[]) => {
    if (!currentIntentMandate) {
      alert('No active Intent Mandate');
      return;
    }

    // Step 2: Create Cart Mandate (requires biometric auth)
    const cartMandate = await createCartMandate(
      currentIntentMandate.mandate.mandate_id,
      selectedProducts,
      { merchant_id: 'nike', name: 'Nike' },
      {
        paymentMethodId: 'pm_card_123',
        shippingAddress: userAddress,
      }
    );

    if (cartMandate) {
      // Step 3: Process payment (requires biometric auth)
      const result = await processPayment(
        cartMandate.mandate.mandate_id,
        'pm_card_123'
      );

      if (result && result.status === 'success') {
        alert('Purchase successful!');
      }
    }
  };

  return (
    <View>
      <Button onPress={handleSearch} disabled={isCreatingIntent}>
        {isCreatingIntent ? 'Creating...' : 'Search Products'}
      </Button>
      {error && <Text style={{color: 'red'}}>{error}</Text>}
    </View>
  );
}
```

### Mobile: Direct API Calls

```typescript
import { AP2ApiService } from '../services/AP2MandateManager';

const apiService = new AP2ApiService(API_BASE_URL, authToken);

// Get user's active mandates
const activeMandates = await apiService.getUserMandates('intent', 'active');

// Revoke a mandate
await apiService.revokeMandate('mandate_intent_123', 'User cancelled');
```

## Database Schema

### Intent Mandates Table
```sql
CREATE TABLE intent_mandates (
    id UUID PRIMARY KEY,
    mandate_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    request TEXT NOT NULL,
    max_price DECIMAL(10,2) NOT NULL,
    min_price DECIMAL(10,2),
    valid_until TIMESTAMP NOT NULL,
    approved_merchants TEXT[],
    blocked_merchants TEXT[],
    categories TEXT[],
    status VARCHAR(20) DEFAULT 'active',
    signature TEXT NOT NULL,
    public_key TEXT NOT NULL,
    algorithm VARCHAR(20) DEFAULT 'ed25519',
    signed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Cart Mandates Table
```sql
CREATE TABLE cart_mandates (
    id UUID PRIMARY KEY,
    mandate_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    intent_mandate_id VARCHAR(100) REFERENCES intent_mandates(mandate_id),
    items JSONB NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    merchant_id VARCHAR(255) NOT NULL,
    merchant_name VARCHAR(255) NOT NULL,
    payment_method_id VARCHAR(255),
    shipping_address JSONB,
    status VARCHAR(20) DEFAULT 'active',
    signature TEXT NOT NULL,
    public_key TEXT NOT NULL,
    algorithm VARCHAR(20) DEFAULT 'ed25519',
    signed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Mandate Audit Events Table
```sql
CREATE TABLE mandate_audit_events (
    id UUID PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    mandate_id VARCHAR(100) NOT NULL,
    mandate_type VARCHAR(20) NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### AP2 Transactions Table
```sql
CREATE TABLE ap2_transactions (
    id UUID PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    mandate_id VARCHAR(100) REFERENCES cart_mandates(mandate_id),
    user_id UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    merchant_id VARCHAR(255) NOT NULL,
    merchant_name VARCHAR(255) NOT NULL,
    payment_provider VARCHAR(50),
    receipt_url TEXT,
    error_code VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Considerations

### Cryptographic Signing
- **Backend**: Uses Node.js native `crypto` module with Ed25519 signatures
- **Mobile**: Uses Expo SecureStore for key storage
- **Production**: Should use proper Ed25519 libraries like `@noble/ed25519`

### Biometric Authentication
- Cart Mandate creation requires biometric authentication
- Payment processing requires biometric authentication
- Falls back to device passcode if biometrics unavailable

### Key Management
- Private keys stored in Expo SecureStore on mobile
- Keys never transmitted to backend
- Backend only receives signed mandates and public keys

### Mandate Validation
- All mandates verified before processing
- Cart Mandates validated against Intent Mandates
- Budget constraints enforced
- Merchant allow/block lists checked
- Expiration times validated

## Testing

### Unit Tests
```bash
cd packages/ap2-mandate
npm test
```

### Integration Tests
```bash
cd apps/backend
npm test
```

### Mobile Testing
```bash
cd apps/mobile
npx expo start
```

## Environment Variables

Add to your `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/agentic_commerce

# Payment (already configured)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Custom AP2 settings
AP2_MANDATE_VALIDITY_HOURS=24
AP2_REQUIRE_BIOMETRIC=true
```

## Production Deployment Checklist

- [ ] Replace placeholder crypto with proper Ed25519 implementation
- [ ] Configure biometric authentication requirements
- [ ] Set up mandate expiration cleanup job
- [ ] Configure payment provider AP2 endpoints
- [ ] Set up monitoring for mandate operations
- [ ] Implement rate limiting for mandate endpoints
- [ ] Add fraud detection integration
- [ ] Configure backup key recovery mechanism
- [ ] Set up compliance logging
- [ ] Test with multiple payment providers

## API Response Examples

### Create Intent Mandate Response
```json
{
  "success": true,
  "data": {
    "mandate": {
      "mandate_id": "mandate_intent_a1b2c3...",
      "mandate_type": "intent",
      "user_id": "user_123",
      "request": "Find wireless headphones under $200",
      "constraints": {
        "max_price": 200,
        "valid_until": "2025-12-23T10:30:00Z",
        "categories": ["electronics"]
      },
      "created_at": "2025-12-22T10:30:00Z",
      "status": "active"
    },
    "signature": "base64_encoded_signature...",
    "public_key": "base64_encoded_public_key...",
    "algorithm": "ed25519",
    "signed_at": "2025-12-22T10:30:00Z"
  }
}
```

### Process Payment Response
```json
{
  "success": true,
  "data": {
    "transaction_id": "txn_a1b2c3...",
    "mandate_id": "mandate_cart_x1y2z3...",
    "status": "success",
    "amount": 179.99,
    "currency": "USD",
    "merchant": {
      "merchant_id": "amazon",
      "name": "Amazon"
    },
    "timestamp": "2025-12-22T10:35:00Z",
    "receipt_url": "https://..."
  }
}
```

## Troubleshooting

### Common Issues

**Issue**: "Key pair not initialized"
- **Solution**: Call `mandateManager.initialize()` before using the manager

**Issue**: "Invalid mandate signature"
- **Solution**: Ensure the mandate hasn't been modified after signing

**Issue**: "Cart Mandate validation failed"
- **Solution**: Check that total price is within Intent Mandate budget constraints

**Issue**: "Authentication required"
- **Solution**: Ensure biometric authentication is set up on the device

## Support

For questions or issues with AP2 implementation:
1. Check the [AP2 Protocol Documentation](https://github.com/google-agentic-commerce/AP2)
2. Review the audit trail: `GET /api/v1/mandates/:mandateId/audit`
3. Check application logs for detailed error messages

## References

- [Google AP2 Protocol Specification](https://github.com/google-agentic-commerce/AP2)
- [AP2 Best Practices Guide](https://docs.google.com/ap2-best-practices)
- [Expo Secure Store Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
