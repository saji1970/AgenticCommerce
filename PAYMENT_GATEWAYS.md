# Payment Gateway Configuration Guide

The Agentic Commerce platform supports multiple payment gateways through a unified interface. You can easily switch between gateways by changing configuration.

## Supported Payment Gateways

1. **Stripe** - Global payment platform (default)
2. **Razorpay** - Popular in India and Southeast Asia
3. **PayPal** - Worldwide digital wallet and payment processor
4. **Square** - Retail and small business focused

## Configuration

### Environment Variables

Set these variables to configure your payment gateway:

```bash
# Gateway Selection
PAYMENT_GATEWAY=stripe  # Options: stripe, razorpay, paypal, square

# Gateway Credentials (choose based on gateway)
PAYMENT_API_KEY=your_api_key
PAYMENT_API_SECRET=your_api_secret  # Required for some gateways
PAYMENT_WEBHOOK_SECRET=your_webhook_secret

# Environment
NODE_ENV=production  # or 'development' for test mode
```

### Gateway-Specific Setup

#### 1. Stripe (Default)

```bash
PAYMENT_GATEWAY=stripe
PAYMENT_API_KEY=sk_test_xxxxx  # Secret key
PAYMENT_WEBHOOK_SECRET=whsec_xxxxx
```

**Features:**
- ✅ Payment intents
- ✅ Setup intents (saved payment methods)
- ✅ Virtual cards (Issuing)
- ✅ Customer management
- ✅ Refunds
- ✅ Webhooks

**Dependencies:**
```bash
npm install stripe
```

**Get API Keys:**
1. Sign up at [stripe.com](https://stripe.com)
2. Go to Dashboard → Developers → API Keys
3. Copy Secret Key and Publishable Key

---

#### 2. Razorpay

```bash
PAYMENT_GATEWAY=razorpay
PAYMENT_API_KEY=rzp_test_xxxxx  # Key ID
PAYMENT_API_SECRET=xxxxx  # Key Secret
PAYMENT_WEBHOOK_SECRET=xxxxx
```

**Features:**
- ✅ Payment orders
- ✅ Customer management
- ✅ Payment tokens
- ✅ Refunds
- ✅ Webhooks
- ❌ Virtual cards (not supported)

**Dependencies:**
```bash
npm install razorpay
```

**Get API Keys:**
1. Sign up at [razorpay.com](https://razorpay.com)
2. Go to Settings → API Keys
3. Generate Test/Live keys

**Note:** Razorpay uses "orders" instead of payment intents. The adapter handles this translation automatically.

---

#### 3. PayPal

```bash
PAYMENT_GATEWAY=paypal
PAYMENT_API_KEY=your_client_id
PAYMENT_API_SECRET=your_client_secret
```

**Features:**
- ✅ Payment orders
- ✅ Payment capture
- ✅ Refunds
- ✅ Webhooks
- ❌ Customer API (managed through PayPal accounts)
- ❌ Saved payment methods (managed through PayPal)
- ❌ Virtual cards (not supported)

**Dependencies:**
```bash
npm install @paypal/checkout-server-sdk
```

**Get API Keys:**
1. Sign up at [developer.paypal.com](https://developer.paypal.com)
2. Create a REST API app
3. Copy Client ID and Secret

**Note:** PayPal payments redirect users to PayPal for approval. Customer and payment method management happens through PayPal accounts.

---

#### 4. Square

```bash
PAYMENT_GATEWAY=square
PAYMENT_API_KEY=your_access_token
PAYMENT_WEBHOOK_SECRET=your_webhook_signature_key
```

**Features:**
- ✅ Payment intents
- ✅ Customer management
- ✅ Cards on file
- ✅ Refunds
- ✅ Webhooks
- ❌ Virtual cards (not supported)

**Dependencies:**
```bash
npm install square uuid
```

**Get API Keys:**
1. Sign up at [squareup.com](https://squareup.com)
2. Go to Developer Dashboard
3. Create an application
4. Copy Access Token

**Note:** Square uses "cards on file" instead of setup intents. The adapter provides compatibility.

---

## Installation

### Install Specific Gateway Dependencies

You only need to install dependencies for the gateway you're using:

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

### Install All Gateways (Development)

```bash
npm install stripe razorpay @paypal/checkout-server-sdk square uuid
```

## Usage Examples

### Backend Service

The payment service automatically uses the configured gateway:

```typescript
import { paymentService } from './config/services';

// Create a payment
const payment = await paymentService.createPaymentIntent({
  amount: 99.99,
  currency: 'USD',
  customerId: 'cus_123',
  description: 'Product purchase',
});

// Confirm payment
await paymentService.confirmPaymentIntent(payment.id);

// Create refund
await paymentService.refundPayment({
  paymentIntentId: payment.id,
  amount: 50.00,
  reason: 'customer_request',
});
```

### Programmatic Gateway Switching

You can also create multiple payment services for different gateways:

```typescript
import { PaymentService } from '@agentic-commerce/payment';

// Stripe for US customers
const stripeService = new PaymentService({
  gateway: 'stripe',
  config: {
    apiKey: process.env.STRIPE_SECRET_KEY!,
    environment: 'production',
  },
});
await stripeService.init();

// Razorpay for Indian customers
const razorpayService = new PaymentService({
  gateway: 'razorpay',
  config: {
    apiKey: process.env.RAZORPAY_KEY_ID!,
    apiSecret: process.env.RAZORPAY_KEY_SECRET!,
    environment: 'production',
  },
});
await razorpayService.init();
```

## Mobile App Configuration

Update the mobile app to use the selected gateway:

```typescript
// apps/mobile/.env
EXPO_PUBLIC_PAYMENT_GATEWAY=stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

For React Native, install the appropriate SDK:

```bash
# Stripe
npx expo install @stripe/stripe-react-native

# Razorpay
npm install react-native-razorpay

# PayPal
npm install react-native-paypal

# Square
npm install react-native-square-in-app-payments
```

## Feature Comparison

| Feature | Stripe | Razorpay | PayPal | Square |
|---------|--------|----------|--------|--------|
| Payment Intents | ✅ | ✅ | ✅ | ✅ |
| Saved Payment Methods | ✅ | ✅ | ❌ | ✅ |
| Customer Management | ✅ | ✅ | ❌ | ✅ |
| Virtual Cards | ✅ | ❌ | ❌ | ❌ |
| Refunds | ✅ | ✅ | ✅ | ✅ |
| Webhooks | ✅ | ✅ | ✅ | ✅ |
| Recurring Payments | ✅ | ✅ | ✅ | ✅ |
| Global Coverage | ✅ | Regional | ✅ | ✅ |
| Transaction Fees | 2.9% + 30¢ | 2% + taxes | 2.9% + 30¢ | 2.6% + 10¢ |

## Regional Recommendations

- **United States**: Stripe or Square
- **Europe**: Stripe or PayPal
- **India**: Razorpay
- **Southeast Asia**: Razorpay or Stripe
- **Global**: Stripe or PayPal

## Testing

All gateways provide test/sandbox environments:

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
```

### Razorpay Test Cards
```
Success: 4111 1111 1111 1111
CVV: Any 3 digits
OTP: 1234
```

### PayPal Sandbox
- Use sandbox accounts from developer.paypal.com
- Test buyer and seller accounts

### Square Sandbox
```
Success: 4111 1111 1111 1111
CVV: Any 3 digits
ZIP: Any 5 digits
```

## Webhook Configuration

Each gateway requires webhook endpoint configuration:

### Webhook URL Format
```
https://your-domain.com/api/v1/webhooks/payment
```

### Configure Webhooks

**Stripe:**
1. Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/v1/webhooks/payment`
3. Select events: `payment_intent.*`, `customer.*`

**Razorpay:**
1. Dashboard → Webhooks
2. Add webhook URL
3. Select events: `payment.*`, `order.*`

**PayPal:**
1. Developer Dashboard → Webhooks
2. Add webhook URL
3. Select events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`

**Square:**
1. Developer Dashboard → Webhooks
2. Add webhook URL
3. Select events: `payment.created`, `payment.updated`

## Error Handling

All adapters throw standardized errors:

```typescript
try {
  await paymentService.createPaymentIntent({...});
} catch (error) {
  console.error('Payment failed:', error.message);
  // Handle error appropriately
}
```

## Security Best Practices

1. **Never expose API secrets** in client-side code
2. **Use webhooks** for server-side payment confirmations
3. **Verify webhook signatures** before processing
4. **Use HTTPS** for all payment endpoints
5. **Store credentials** in environment variables
6. **Rotate API keys** periodically
7. **Enable 3D Secure** when available
8. **Log all transactions** for audit trails

## Migration Between Gateways

To switch gateways:

1. Update environment variables
2. Install new gateway dependencies
3. Test in sandbox/test mode
4. Update webhook configurations
5. Migrate existing customers (if needed)
6. Deploy and monitor

## Support

For gateway-specific issues:
- **Stripe**: [stripe.com/support](https://stripe.com/support)
- **Razorpay**: [razorpay.com/support](https://razorpay.com/support)
- **PayPal**: [developer.paypal.com/support](https://developer.paypal.com/support)
- **Square**: [squareup.com/help](https://squareup.com/help)

For integration issues, see [GitHub Issues](https://github.com/your-org/agentic-commerce/issues)
