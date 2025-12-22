# Payment System Refactoring Changelog

## Overview

The payment system has been refactored from a Stripe-only implementation to a flexible, multi-gateway architecture that supports:

- **Stripe** (Global)
- **Razorpay** (India, Southeast Asia)
- **PayPal** (Global)
- **Square** (Retail, Small Business)

## What Changed

### 1. New Architecture

**Before:**
```typescript
// Direct Stripe dependency
import { PaymentService } from '@agentic-commerce/payment';
const paymentService = new PaymentService({
  secretKey: process.env.STRIPE_SECRET_KEY
});
```

**After:**
```typescript
// Gateway-agnostic service
import { PaymentService } from '@agentic-commerce/payment';
const paymentService = new PaymentService({
  gateway: 'stripe', // or 'razorpay', 'paypal', 'square'
  config: {
    apiKey: process.env.PAYMENT_API_KEY,
    apiSecret: process.env.PAYMENT_API_SECRET,
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
  }
});
await paymentService.init();
```

### 2. New Files Created

```
packages/payment/src/
├── interfaces/
│   └── IPaymentGateway.ts          # Gateway abstraction interface
├── adapters/
│   ├── StripeAdapter.ts            # Stripe implementation
│   ├── RazorpayAdapter.ts          # Razorpay implementation
│   ├── PayPalAdapter.ts            # PayPal implementation
│   └── SquareAdapter.ts            # Square implementation
├── PaymentGatewayFactory.ts        # Factory pattern for gateway creation
├── PaymentService.ts               # Unified payment service
└── index.ts                        # Package exports
```

### 3. Package Dependencies

**Before:**
```json
{
  "dependencies": {
    "stripe": "^14.7.0"
  }
}
```

**After:**
```json
{
  "peerDependencies": {
    "stripe": "^14.7.0",
    "razorpay": "^2.9.0",
    "@paypal/checkout-server-sdk": "^1.0.3",
    "square": "^34.0.0",
    "uuid": "^9.0.1"
  },
  "peerDependenciesMeta": {
    "stripe": { "optional": true },
    "razorpay": { "optional": true },
    "@paypal/checkout-server-sdk": { "optional": true },
    "square": { "optional": true }
  }
}
```

**Benefit:** Only install the SDK for the gateway you're using, reducing bundle size.

### 4. Environment Variables

**New Variables:**
```bash
# Gateway selection
PAYMENT_GATEWAY=stripe  # stripe | razorpay | paypal | square

# Unified credentials (works for all gateways)
PAYMENT_API_KEY=your_api_key
PAYMENT_API_SECRET=your_api_secret
PAYMENT_WEBHOOK_SECRET=your_webhook_secret
```

**Legacy Support:**
The system still supports old Stripe-specific variables for backward compatibility:
```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 5. API Compatibility

The payment service API remains **100% backward compatible**. All existing code continues to work:

```typescript
// These methods work identically regardless of gateway
await paymentService.createPaymentIntent({...});
await paymentService.confirmPaymentIntent(id);
await paymentService.createCustomer(email, name);
await paymentService.getPaymentMethods(customerId);
await paymentService.refundPayment({...});
```

### 6. Gateway-Specific Features

Each adapter translates gateway-specific concepts to the common interface:

| Concept | Stripe | Razorpay | PayPal | Square |
|---------|--------|----------|--------|--------|
| Payment | PaymentIntent | Order | Order | Payment |
| Customer | Customer | Customer | N/A | Customer |
| Saved Card | PaymentMethod | Token | N/A | Card on File |

### 7. Feature Support Matrix

| Feature | Stripe | Razorpay | PayPal | Square |
|---------|:------:|:--------:|:------:|:------:|
| Payment Intents | ✅ | ✅ | ✅ | ✅ |
| Save Payment Methods | ✅ | ✅ | ❌ | ✅ |
| Customer Management | ✅ | ✅ | ❌ | ✅ |
| Virtual Cards | ✅ | ❌ | ❌ | ❌ |
| Refunds | ✅ | ✅ | ✅ | ✅ |
| Webhooks | ✅ | ✅ | ✅ | ✅ |

## Migration Guide

### For Existing Users (Stripe)

No changes required! Your existing Stripe integration continues to work.

**Option 1: Keep using legacy variables**
```bash
# Continue using these
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Option 2: Switch to new format**
```bash
PAYMENT_GATEWAY=stripe
PAYMENT_API_KEY=sk_test_xxxxx  # Your Stripe secret key
PAYMENT_WEBHOOK_SECRET=whsec_xxxxx
```

### For New Users

Choose your preferred gateway and configure:

**Stripe Example:**
```bash
PAYMENT_GATEWAY=stripe
PAYMENT_API_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
PAYMENT_WEBHOOK_SECRET=whsec_xxxxx
```

**Razorpay Example:**
```bash
PAYMENT_GATEWAY=razorpay
PAYMENT_API_KEY=rzp_test_xxxxx
PAYMENT_API_SECRET=xxxxx
PAYMENT_WEBHOOK_SECRET=xxxxx
```

**PayPal Example:**
```bash
PAYMENT_GATEWAY=paypal
PAYMENT_API_KEY=AeA1QIZXiflr-X3EdRJK8Z2TvVNjFIBIr6SrMhZJXdBhXjNITCLTkw9ks6jcH
PAYMENT_API_SECRET=EFPGiGYqfZlMGz7w8zFElv15JA4e5PfCxe2vGWXV5z3q15crzjTZx8
```

**Square Example:**
```bash
PAYMENT_GATEWAY=square
PAYMENT_API_KEY=EAAAEN7Nq9JlvMBNXGr4ZqYy3A-jQiQQvz5T3qJzqQm7vN7gHvhXlA
PAYMENT_WEBHOOK_SECRET=xxxxx
```

## Installation

### Install Gateway SDK

You only need to install the SDK for your chosen gateway:

```bash
# For Stripe
npm install stripe

# For Razorpay
npm install razorpay

# For PayPal
npm install @paypal/checkout-server-sdk

# For Square
npm install square uuid
```

## Testing

All gateways provide test/sandbox modes with test credentials and test cards.

See [PAYMENT_GATEWAYS.md](./PAYMENT_GATEWAYS.md) for:
- Test credentials for each gateway
- Test card numbers
- Webhook setup
- Feature comparison
- Regional recommendations

## Benefits

1. **Flexibility**: Switch payment providers without code changes
2. **Regional Optimization**: Use the best gateway for each market
3. **Reduced Vendor Lock-in**: Not tied to a single provider
4. **Cost Optimization**: Choose gateway with best rates for your region
5. **Risk Mitigation**: Backup gateway if primary goes down
6. **Bundle Size**: Only include SDKs you actually use

## Breaking Changes

**None.** This is a fully backward-compatible refactoring.

## New Documentation

- [PAYMENT_GATEWAYS.md](./PAYMENT_GATEWAYS.md) - Complete guide for all gateways
- Updated [README.md](./README.md) - Reflects multi-gateway support
- Updated `.env.example` files - New configuration format

## Future Enhancements

Potential additions (not yet implemented):

- **Braintree** adapter
- **Adyen** adapter
- **2Checkout** adapter
- **Authorize.Net** adapter
- Multi-gateway routing (route transactions based on rules)
- Gateway health monitoring and automatic failover
- A/B testing framework for comparing gateways

## Questions?

See [PAYMENT_GATEWAYS.md](./PAYMENT_GATEWAYS.md) for detailed setup instructions or open an issue on GitHub.

---

**Migration Support:** The old Stripe-only implementation is still available in git history. To access it:
```bash
git log --all --full-history --oneline -- packages/payment/
```
