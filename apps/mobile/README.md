# Agentic Commerce Mobile App

A configurable, framework-like mobile app for agentic commerce with ChatGPT-like UI, mandate system, and price alerts.

## Features

- **ChatGPT-like UI**: Natural language interface for shopping requests
- **Mandate System**: Intent, Cart, and Payment mandates (AP2 standards)
- **Product Search**: Search across multiple stores (online and in-store)
- **Price Alerts**: Set rules to buy when prices drop below target
- **Railway Backend Integration**: Connects to your Railway-deployed backend
- **Demo Mode**: Fallback mode with mock data for testing
- **Configurable Framework**: Can be integrated into existing apps

## Quick Start

### 1. Configure Railway Backend

Create `.env` file in `apps/mobile/`:

```env
EXPO_PUBLIC_RAILWAY_API_URL=https://your-app.railway.app/api/v1
```

Replace with your actual Railway deployment URL.

### 2. Install Dependencies

```bash
cd apps/mobile
npm install
```

### 3. Run the App

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Configuration

### Railway Backend (Recommended)

The app is configured to use your Railway backend by default:

```env
EXPO_PUBLIC_RAILWAY_API_URL=https://your-app.railway.app/api/v1
```

### Demo Mode

For testing without backend:

```env
EXPO_PUBLIC_DEMO_MODE=true
```

Or with fallback:

```env
EXPO_PUBLIC_RAILWAY_API_URL=https://your-app.railway.app/api/v1
EXPO_PUBLIC_FALLBACK_TO_DEMO=true
```

See [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) for detailed setup instructions.

## Usage

### As a Standalone App

```bash
npm start
```

### As a Framework/Module

```typescript
import { AgenticCommerceFramework } from '@agentic-commerce/mobile';

// Use in your app
<AgenticCommerceFramework
  config={{
    apiBaseUrl: 'https://your-api.com/api/v1',
    enablePriceAlerts: true,
    theme: { primaryColor: '#6200EE' }
  }}
/>
```

## Mandate System

### Intent Mandate
Represents a user's shopping intent or requirement. Created when user expresses what they want to buy.

### Cart Mandate
Represents a shopping cart with items from different stores. Can be linked to an Intent Mandate.

### Payment Mandate
Represents a payment authorization. Created when user approves a Cart Mandate for payment.

## Price Rules

Users can set rules like:
- "Buy this product when price drops below $X"
- "Notify me when this item is available in-store"
- "Purchase automatically when conditions are met"

## API Integration

The app integrates with the Agentic Commerce backend API:
- `/agent/chat` - Chat with AI agent
- `/agent/search` - Search products
- `/mandates/intent` - Intent mandate management
- `/mandates/cart` - Cart mandate management
- `/mandates/payment` - Payment mandate management
- `/rules/price` - Price rule management

## Development

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Building

```bash
# Build for Android
npm run build:android

# Build for iOS
npm run build:ios
```

## Documentation

- [Railway Setup Guide](./RAILWAY_SETUP.md) - Configure Railway backend
- [Demo Mode Guide](./DEMO_MODE.md) - Using demo mode
- [Integration Guide](./INTEGRATION_GUIDE.md) - Integrate into existing apps
