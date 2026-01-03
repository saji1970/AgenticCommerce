# Demo Mode Guide

The Agentic Commerce mobile app includes a built-in demo mode that allows you to test all features without a backend server.

## Enabling Demo Mode

### Method 1: Environment Variable

Create a `.env` file in the `apps/mobile` directory:

```env
EXPO_PUBLIC_DEMO_MODE=true
```

### Method 2: Programmatic Configuration

```typescript
import { setDemoMode } from '@agentic-commerce/mobile/config';

// Enable demo mode
setDemoMode(true);

// Disable demo mode (use real API)
setDemoMode(false);
```

### Method 3: Framework Configuration

```typescript
import { AgenticCommerceFramework, setDemoMode } from '@agentic-commerce/mobile';

// Enable demo mode before rendering
setDemoMode(true);

<AgenticCommerceFramework config={yourConfig} />
```

## Demo Features

When demo mode is enabled, the app uses mock data for:

### 1. Chat/AI Agent
- Simulated responses based on user queries
- Product search results
- Price comparisons
- Intent recognition

### 2. Product Search
- Pre-populated demo products:
  - MacBook Pro (multiple stores)
  - Dell XPS 15
  - Sony WH-1000XM5 Headphones
- Filtering by price, store, and availability
- Online and in-store locations

### 3. Mandates
- Sample Intent Mandates
- Sample Cart Mandates
- Sample Payment Mandates

### 4. Price Rules
- Pre-configured price alerts
- Create/delete rules (stored locally in demo mode)

## Demo Data

The demo includes:

- **5 Products** across different stores (Apple, Best Buy, Amazon)
- **2 Intent Mandates** (active and fulfilled)
- **1 Cart Mandate** (pending approval)
- **2 Price Rules** (active alerts)

## Testing Scenarios

### Test Product Search
Try these queries in the chat:
- "Find me a laptop"
- "Show me headphones"
- "Search for MacBook"

### Test Price Alerts
- "Notify me when the Sony headphones drop below $350"
- "Set an alert for Dell XPS under $1400"

### Test Mandates
- Navigate to "My Mandates" screen to see sample mandates
- Create new mandates through the chat interface

### Test Price Rules
- Navigate to "Price Alerts" screen
- Create new price rules
- Delete existing rules

## Demo Mode Indicator

When demo mode is active, a yellow banner appears at the top of the chat screen indicating "Demo Mode - Using Mock Data".

## Switching to Production

To use the real backend API:

1. Set `EXPO_PUBLIC_DEMO_MODE=false` or remove the env variable
2. Or call `setDemoMode(false)` in your code
3. Ensure your backend API is running and configured correctly

## Limitations

In demo mode:
- Data is not persisted (resets on app restart)
- No real API calls are made
- Authentication is not required
- Some advanced features may be simplified

## Example Usage

```typescript
import React, { useEffect } from 'react';
import { AgenticCommerceFramework, setDemoMode } from '@agentic-commerce/mobile';

function App() {
  useEffect(() => {
    // Enable demo mode for development
    if (__DEV__) {
      setDemoMode(true);
    }
  }, []);

  return (
    <AgenticCommerceFramework
      config={{
        apiBaseUrl: 'https://api.example.com',
        // ... other config
      }}
    />
  );
}
```

## Next Steps

1. **Try the demo**: Enable demo mode and explore all features
2. **Test integrations**: See how mandates and price rules work
3. **Customize**: Modify demo data in `src/services/demoData.ts`
4. **Connect backend**: Disable demo mode and connect to your API

