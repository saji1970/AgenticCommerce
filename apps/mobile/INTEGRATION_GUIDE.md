# Agentic Commerce Mobile Framework - Integration Guide

This guide explains how to integrate the Agentic Commerce mobile framework into your existing React Native app.

## Quick Start

### 1. Install Dependencies

```bash
npm install @agentic-commerce/mobile
# or
yarn add @agentic-commerce/mobile
```

### 2. Basic Integration

```tsx
import React from 'react';
import { AgenticCommerceFramework } from '@agentic-commerce/mobile';

function MyApp() {
  return (
    <AgenticCommerceFramework
      config={{
        apiBaseUrl: 'https://your-api.com/api/v1',
        enablePriceAlerts: true,
        enableInStoreSearch: true,
        defaultCurrency: 'USD',
        supportedStores: ['amazon', 'walmart', 'target'],
        theme: {
          primaryColor: '#6200EE',
          secondaryColor: '#03DAC6',
        },
      }}
    />
  );
}
```

### 3. Advanced Integration

#### Using as a Screen in Navigation

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatScreen } from '@agentic-commerce/mobile/screens';

const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ShoppingAgent" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

#### Using Individual Components

```tsx
import { ChatInput, ChatMessage } from '@agentic-commerce/mobile/components';
import { api } from '@agentic-commerce/mobile/services';
import { setConfig } from '@agentic-commerce/mobile/config';

// Configure the framework
setConfig({
  apiBaseUrl: 'https://your-api.com/api/v1',
});

// Use components
function CustomChatScreen() {
  const handleSend = async (message: string) => {
    const response = await api.sendMessage(message);
    // Handle response
  };

  return (
    <View>
      <ChatMessage message={response} />
      <ChatInput onSendMessage={handleSend} />
    </View>
  );
}
```

## Configuration Options

### AppConfig Interface

```typescript
interface AppConfig {
  apiBaseUrl: string;                    // Backend API URL
  enablePriceAlerts: boolean;            // Enable price alert features
  enableInStoreSearch: boolean;          // Enable in-store product search
  defaultCurrency: string;               // Default currency code (USD, EUR, etc.)
  supportedStores: string[];             // List of supported store names
  theme?: {
    primaryColor?: string;               // Primary theme color
    secondaryColor?: string;            // Secondary theme color
  };
}
```

## Mandate System

### Intent Mandate

Represents a user's shopping intent. Created when user expresses what they want to buy.

```typescript
import { api } from '@agentic-commerce/mobile';

const intentMandate = await api.createIntentMandate(
  "I need a new laptop under $1000"
);
```

### Cart Mandate

Represents a shopping cart with items from different stores.

```typescript
const cartMandate = await api.createCartMandate([
  {
    productId: "prod-123",
    name: "Laptop",
    price: 999.99,
    quantity: 1,
    store: "amazon",
    availability: "in_stock",
  },
]);
```

### Payment Mandate

Represents a payment authorization for a cart.

```typescript
const paymentMandate = await api.createPaymentMandate(
  cartMandate.id,
  "credit_card"
);
```

## Price Rules

Set up automatic purchasing rules:

```typescript
// Create a price alert
const rule = await api.createPriceRule(
  "prod-123",
  "Laptop",
  800.00  // Buy when price drops below $800
);

// Get all active price rules
const rules = await api.getPriceRules();

// Delete a rule
await api.deletePriceRule(rule.id);
```

## API Service

The framework provides a pre-configured API service:

```typescript
import { api } from '@agentic-commerce/mobile';

// Set authentication token
api.setAuthToken('your-jwt-token');

// Send chat message
const response = await api.sendMessage('Find me a laptop');

// Search products
const products = await api.searchProducts('laptop', {
  maxPrice: 1000,
  stores: ['amazon', 'bestbuy'],
  inStore: true,
});

// Compare products
const comparison = await api.compareProducts(['prod-1', 'prod-2']);
```

## Redux Store Integration

The framework uses Redux for state management. You can integrate it with your existing store:

```typescript
import { store as agenticStore } from '@agentic-commerce/mobile';
import { combineReducers } from '@reduxjs/toolkit';

const rootReducer = combineReducers({
  // Your app reducers
  user: userReducer,
  // Agentic Commerce reducers
  ...agenticStore.getState(),
});
```

## Theming

Customize the app appearance:

```typescript
import { setConfig } from '@agentic-commerce/mobile/config';

setConfig({
  theme: {
    primaryColor: '#6200EE',    // Your brand color
    secondaryColor: '#03DAC6',  // Accent color
  },
});
```

## Error Handling

```typescript
import { AgenticCommerceFramework } from '@agentic-commerce/mobile';

<AgenticCommerceFramework
  config={config}
  onError={(error) => {
    // Handle errors
    console.error('Agentic Commerce Error:', error);
    // Send to error tracking service
  }}
/>
```

## TypeScript Support

The framework is fully typed. Import types as needed:

```typescript
import type {
  ChatMessage,
  Product,
  IntentMandate,
  CartMandate,
  PaymentMandate,
  PriceRule,
  AppConfig,
} from '@agentic-commerce/mobile';
```

## Best Practices

1. **Configure Early**: Set configuration before rendering the framework
2. **Handle Errors**: Implement error boundaries and error handlers
3. **Authentication**: Set auth tokens when user logs in
4. **Offline Support**: Consider implementing offline caching
5. **Analytics**: Track user interactions with mandates and searches

## Example: Full Integration

```tsx
import React, { useEffect } from 'react';
import { AgenticCommerceFramework, setConfig, api } from '@agentic-commerce/mobile';

function App() {
  useEffect(() => {
    // Configure framework
    setConfig({
      apiBaseUrl: process.env.API_URL,
      enablePriceAlerts: true,
      enableInStoreSearch: true,
      defaultCurrency: 'USD',
      supportedStores: ['amazon', 'walmart', 'target', 'bestbuy'],
      theme: {
        primaryColor: '#6200EE',
        secondaryColor: '#03DAC6',
      },
    });

    // Set auth token if user is logged in
    const token = getAuthToken();
    if (token) {
      api.setAuthToken(token);
    }
  }, []);

  return (
    <AgenticCommerceFramework
      config={{}}
      onError={(error) => {
        // Log to error tracking service
        logError(error);
      }}
    />
  );
}
```

## Support

For more information, see:
- [Main README](./README.md)
- [API Documentation](../backend/README.md)
- [Mandate System Documentation](./MANDATES.md)

