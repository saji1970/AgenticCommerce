# Mandate System Demo Guide

## Overview

This guide walks you through the complete mandate system demo, showing how users can authorize AI agents to perform shopping actions through cart mandates, intent mandates, and payment mandates.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Journey                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User tells AI: "Add MacBook Pro to cart when price < $2000" │
│                          ↓                                       │
│  2. Intent Mandate Popup appears                                 │
│                          ↓                                       │
│  3. User reviews and signs mandate                               │
│                          ↓                                       │
│  4. AI monitors and creates purchase intent                      │
│                          ↓                                       │
│  5. User approves intent in app                                  │
│                          ↓                                       │
│  6. AI executes purchase (if payment mandate exists)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## What Was Built

### 1. Modular Mandate Configuration (`packages/shared-types/src/mandate-config.types.ts`)

A flexible configuration system that allows the mandate module to work with different payment gateways:

- **Payment Gateway Providers**: Mock, Stripe, PayPal, Square, Custom
- **Feature Flags**: Enable/disable cart, intent, payment mandates
- **Limits Configuration**: Transaction amounts, daily/monthly limits
- **UI Customization**: Brand colors, logos, terms URLs

### 2. Mobile App Components

#### Mandate Signing Modal (`apps/mobile/src/components/mandate/MandateSigningModal.tsx`)
- Beautiful, professional UI for mandate signing
- Shows agent info, constraints, and permissions
- Displays intent details (product, criteria, price)
- Legal text and explicit consent checkbox
- Sign/Cancel actions

#### Mandate Management Screen (`apps/mobile/src/screens/mandate/MandateManagementScreen.tsx`)
- View all active mandates
- See pending purchase intents
- Approve/reject intents
- Suspend/revoke mandates
- Real-time updates

#### Mandate Service (`apps/mobile/src/services/mandate.service.ts`)
- Create mandates
- Get user mandates
- Approve/suspend/revoke mandates
- Manage purchase intents
- Get agent action logs

### 3. Backend Admin APIs (`apps/backend/src/controllers/admin.controller.ts`)

Complete admin dashboard APIs:

- **Dashboard Stats**
  - Total users, mandates, intents
  - Mandates by status and type
  - Total spending
  - Recent activity
  - AP2 transaction stats

- **Mandate Management**
  - View all mandates
  - Filter by status/type
  - See associated users

- **Intent Management**
  - View all purchase intents
  - Filter by status
  - Track execution

- **Transaction Monitoring**
  - All agent actions
  - AP2 gateway transactions
  - User activity logs

- **User Details**
  - User info with mandates
  - Purchase history
  - Agent actions

**API Endpoints:**
```
GET  /api/admin/dashboard/stats       - Dashboard statistics
GET  /api/admin/mandates              - All mandates
GET  /api/admin/intents               - All purchase intents
GET  /api/admin/actions               - All agent actions
GET  /api/admin/users/:userId         - User details
GET  /api/admin/ap2/transactions      - AP2 transactions
```

### 4. Sample Data Generator (`apps/backend/src/scripts/generate-sample-data.ts`)

Creates complete demo environment:

- **3 Demo Users**
  - alice@example.com
  - bob@example.com
  - carol@example.com
  - Password: Demo123!

- **Mandates for Each User**
  - Cart mandates (active)
  - Intent mandates (active)
  - Payment mandates (for alice only)

- **Sample Purchase Intents**
  - MacBook Pro intent (pending)
  - Sony Headphones intent (approved)
  - iPad Air intent (executed)

- **8 Sample Products**
  - MacBook Pro, iPad, AirPods, Apple Watch
  - Sony Headphones, Kindle
  - Dyson Vacuum, Ninja Air Fryer

- **AP2 Transactions**
  - Cart operations
  - Intent creations
  - Payment executions

## Setup Instructions

### Step 1: Run Database Migrations

```bash
# Run the AP2 migration if you haven't already
cd apps/backend
psql -U postgres -d agentic_commerce -f migrations/005_create_ap2_tables.sql
```

### Step 2: Generate Sample Data

```bash
cd apps/backend
npx ts-node src/scripts/generate-sample-data.ts
```

You should see:
```
🎬 Starting sample data generation...
👥 Creating sample users...
   ✓ Created user: alice@example.com
   ✓ Created user: bob@example.com
   ✓ Created user: carol@example.com
🤖 Creating sample mandates...
   ✓ Created cart mandate for user 1
   ✓ Created 3 sample intents for user 1
   ...
✅ Sample data generation complete!
```

### Step 3: Start the Backend

```bash
cd apps/backend
pnpm run dev
```

### Step 4: Test Admin APIs

```bash
# Login as demo user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "Demo123!"
  }'

# Save the token from response

# Get dashboard stats
curl http://localhost:3000/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get all mandates
curl http://localhost:3000/api/admin/mandates \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get pending intents
curl "http://localhost:3000/api/admin/intents?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Demo Scenarios

### Scenario 1: Cart Mandate Flow

**User Story:** Alice wants an AI agent to add items to her cart based on her preferences.

1. **User Action**: "Hey AI, add the new Sony headphones to my cart"

2. **System Response**: Mandate Signing Modal appears
   - Shows "Authorize Cart Management"
   - Displays agent name: "Smart Shopper AI"
   - Shows constraints:
     - Max item value: $500
     - Daily item limit: 10 items
     - Allowed categories: Electronics, Books, Home & Kitchen

3. **User Signs Mandate**
   - Reviews permissions
   - Checks agreement box
   - Clicks "Sign Mandate"

4. **AI Agent Action**
   - Adds Sony WH-1000XM5 Headphones to cart ($399)
   - Transaction logged in admin dashboard
   - User can see item in cart

5. **Admin View**
   - Dashboard shows +1 cart mandate
   - Transaction appears in actions log
   - User's mandate visible in mandate list

### Scenario 2: Intent Mandate Flow

**User Story:** Bob wants to buy a MacBook Pro when it drops below $2000 during Black Friday.

1. **User Action**: "Monitor MacBook Pro 16\" price and buy when it's under $2000"

2. **System Response**: Intent Mandate Modal appears
   - Shows "Authorize Purchase Intent"
   - Displays intent details:
     - Product: MacBook Pro 16\" M3 Max
     - Criteria: "Buy when price drops below $2000 during Black Friday"
     - Target Price: $1,999
   - Shows constraints:
     - Max intent value: $2,000
     - Daily intent limit: 5
     - Auto-approve under: $100

3. **User Signs Mandate**
   - Reviews intent details
   - Agrees to terms
   - Signs mandate

4. **AI Monitoring Phase**
   - AI monitors product price
   - Black Friday arrives, price drops to $1,899
   - AI creates purchase intent

5. **User Approval Required**
   - User opens app
   - Sees "Pending Intents (1)" notification
   - Reviews intent:
     - "Price dropped to $1,899 during Black Friday sale"
     - Total: $2,050.92 (incl. tax)
   - Clicks "Approve"

6. **Intent Execution** (if payment mandate exists)
   - AI executes payment
   - Order placed
   - User receives confirmation

7. **Admin View**
   - Dashboard shows:
     - +1 intent mandate
     - +1 pending intent → approved → executed
     - +$2,050.92 total spending
   - Transaction trail visible

### Scenario 3: Payment Mandate Flow

**User Story:** Carol wants AI to automatically purchase approved items without additional confirmation.

1. **Prerequisites**
   - Cart mandate already signed
   - Intent mandate already signed
   - Now signing payment mandate

2. **Payment Mandate Modal**
   - Shows "Authorize Payment Execution"
   - Displays constraints:
     - Max transaction: $1,000
     - Daily spending limit: $2,000
     - Monthly spending limit: $10,000
     - Payment methods: card, paypal

3. **User Signs**
   - Reviews limits carefully
   - Signs mandate

4. **Autonomous Flow**
   - AI adds items to cart (cart mandate)
   - AI creates purchase intent (intent mandate)
   - Intent auto-approved (under $100 threshold)
   - AI executes payment (payment mandate)
   - User receives notification

5. **Admin Dashboard**
   - Complete transaction flow visible
   - All three mandate types active
   - Spending within limits tracked

## Mobile App Integration Points

### Where to Trigger Mandate Signing

1. **Cart Screen** (`apps/mobile/src/screens/cart/CheckoutScreen.tsx`)
   - When AI suggests adding items
   - Before AI performs cart operations
   - On first AI interaction

2. **Product Details** (`apps/mobile/src/screens/products/ProductDetailsScreen.tsx`)
   - When user says "notify me when price drops"
   - "Watch this product" feature

3. **AI Chat Interface** (to be created)
   - Natural language: "Add this to cart"
   - Intent expression: "Buy when price is under X"
   - Payment authorization: "Auto-buy approved items"

### Navigation Integration

Add to your React Navigation:

```typescript
// In your navigation stack
import { MandateManagementScreen } from './screens/mandate/MandateManagementScreen';

// Add to stack
<Stack.Screen
  name="MandateManagement"
  component={MandateManagementScreen}
  options={{ title: 'AI Mandates' }}
/>

// Add menu item in Profile/Settings
<TouchableOpacity onPress={() => navigation.navigate('MandateManagement')}>
  <Text>Manage AI Permissions</Text>
</TouchableOpacity>
```

### Using Mandate Signing Modal

```typescript
import { MandateSigningModal } from '../components/mandate/MandateSigningModal';
import mandateService from '../services/mandate.service';
import { MandateType } from '@agentic-commerce/shared-types';

// In your component
const [showMandateModal, setShowMandateModal] = useState(false);

const handleSignMandate = async () => {
  const mandate = await mandateService.createMandate({
    agentId: 'smart-shopper-ai',
    agentName: 'Smart Shopper AI',
    type: MandateType.CART,
    constraints: {
      maxItemValue: 500,
      maxItemsPerDay: 10,
      allowedCategories: ['Electronics', 'Books'],
    },
  });

  // Mandate created, AI can now operate
  console.log('Mandate created:', mandate.id);
};

// Render
<MandateSigningModal
  visible={showMandateModal}
  onClose={() => setShowMandateModal(false)}
  onSign={handleSignMandate}
  mandateType={MandateType.CART}
  agentName="Smart Shopper AI"
  constraints={{
    maxItemValue: 500,
    maxItemsPerDay: 10,
  }}
  productNames={['Sony WH-1000XM5 Headphones']}
  estimatedTotal={399.99}
/>
```

## Admin Dashboard Usage

### Accessing Admin APIs

All admin endpoints require authentication. In production, add role-based access control.

```javascript
// Example: Fetch dashboard stats
async function getDashboardStats() {
  const response = await fetch('http://localhost:3000/api/admin/dashboard/stats', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  console.log('Dashboard Stats:', data.stats);
}
```

### Building Admin Dashboard UI

You can build an admin dashboard using:

1. **React Admin** - Full-featured admin panel
2. **Refine** - Headless admin framework
3. **Custom React App** - Full control

**Quick Start with HTML/JS:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>AgenticCommerce Admin</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .stat-card { border: 1px solid #ddd; padding: 20px; margin: 10px; border-radius: 8px; }
    .mandate-list { margin-top: 20px; }
    .mandate-item { border-bottom: 1px solid #eee; padding: 10px; }
  </style>
</head>
<body>
  <h1>AgenticCommerce Admin Dashboard</h1>

  <div id="stats"></div>
  <div id="mandates" class="mandate-list"></div>

  <script>
    const API_URL = 'http://localhost:3000/api';
    const TOKEN = 'your-jwt-token-here';

    async function loadStats() {
      const res = await fetch(`${API_URL}/admin/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      });
      const { stats } = await res.json();

      document.getElementById('stats').innerHTML = `
        <div class="stat-card">
          <h3>Overview</h3>
          <p>Total Users: ${stats.totalUsers}</p>
          <p>Total Mandates: ${stats.mandates.total}</p>
          <p>Active Mandates: ${stats.mandates.byStatus.active || 0}</p>
          <p>Total Intents: ${stats.intents.total}</p>
          <p>Total Spent: $${stats.spending.totalSpent.toFixed(2)}</p>
        </div>
      `;
    }

    async function loadMandates() {
      const res = await fetch(`${API_URL}/admin/mandates?limit=10`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      });
      const { mandates } = await res.json();

      document.getElementById('mandates').innerHTML = `
        <h2>Recent Mandates</h2>
        ${mandates.map(m => `
          <div class="mandate-item">
            <strong>${m.agent_name}</strong> - ${m.type} mandate
            <br>
            User: ${m.user_email}
            <br>
            Status: ${m.status}
          </div>
        `).join('')}
      `;
    }

    loadStats();
    loadMandates();
  </script>
</body>
</html>
```

## Testing the Complete Flow

### End-to-End Test Script

```bash
#!/bin/bash

# 1. Generate sample data
echo "Generating sample data..."
cd apps/backend
npx ts-node src/scripts/generate-sample-data.ts

# 2. Start backend
echo "Starting backend..."
pnpm run dev &
BACKEND_PID=$!
sleep 5

# 3. Login
echo "Logging in as alice@example.com..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Demo123!"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# 4. Get mandates
echo "Fetching mandates..."
curl -s http://localhost:3000/api/mandates \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.mandates'

# 5. Get pending intents
echo "Fetching pending intents..."
curl -s "http://localhost:3000/api/acp/intents?status=pending" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.intents'

# 6. Get admin stats
echo "Fetching admin dashboard stats..."
curl -s http://localhost:3000/api/admin/dashboard/stats \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.stats'

# Cleanup
kill $BACKEND_PID
```

## Key Features Delivered

### ✅ Modular Architecture
- Configurable payment gateway integration
- Feature flags for mandate types
- Customizable UI and branding
- Environment-specific settings

### ✅ Mobile App UI
- Professional mandate signing modal
- Complete mandate management screen
- Intent approval workflow
- Real-time status updates

### ✅ Admin Dashboard APIs
- Comprehensive statistics
- Mandate monitoring
- Intent tracking
- Transaction logs
- User management

### ✅ Sample Data
- 3 demo users with mandates
- Sample products
- Purchase intents in various states
- Transaction history
- Agent action logs

### ✅ Complete Demo Flow
- Cart mandate signing
- Intent mandate with criteria
- Payment mandate authorization
- Admin monitoring
- End-to-end testing

## Next Steps

1. **Run Sample Data Generator**
   ```bash
   cd apps/backend
   npx ts-node src/scripts/generate-sample-data.ts
   ```

2. **Test Admin APIs**
   - Login as alice@example.com
   - Explore dashboard stats
   - View mandates and intents

3. **Integrate Mobile UI**
   - Add Mandate Management to navigation
   - Trigger signing modals in cart flow
   - Show pending intents badge

4. **Build Admin Dashboard**
   - Use provided APIs
   - Create web interface
   - Monitor transactions

5. **Configure Payment Gateway**
   - Update mandate-config.types.ts
   - Set provider credentials
   - Test real transactions

## Configuration for Real Payment Gateway

When ready to integrate with a real payment gateway:

1. **Update Configuration**
   ```typescript
   const gatewayConfig: MandateGatewayConfig = {
     provider: PaymentGatewayProvider.STRIPE,
     enabled: true,
     credentials: {
       apiKey: process.env.STRIPE_API_KEY,
       secretKey: process.env.STRIPE_SECRET_KEY,
     },
     endpoints: {
       authorize: 'https://api.stripe.com/v1/payment_intents',
       capture: 'https://api.stripe.com/v1/payment_intents/:id/capture',
     },
     // ... rest of config
   };
   ```

2. **Implement Gateway Adapter**
   ```typescript
   class StripeGatewayAdapter {
     async processPayment(mandate: Mandate, amount: number) {
       // Stripe-specific implementation
     }
   }
   ```

3. **Update AP2 Gateway Service**
   - Use gateway adapter
   - Handle gateway responses
   - Process webhooks

The modular design allows you to swap payment providers without changing the core mandate logic!

## Support

- **Backend APIs**: See admin.controller.ts for all endpoints
- **Mobile Components**: See mandate/ directory for UI components
- **Sample Data**: Run generate-sample-data.ts script
- **Configuration**: See mandate-config.types.ts for options

---

**Your mandate system is ready to demo!** 🎉

Run the sample data generator and explore the complete agentic commerce flow.
