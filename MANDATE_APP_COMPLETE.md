# Mandate App - Complete Implementation

## Overview

The Mandate App is now a **separate, independent mobile application** that manages AI agent authorizations across multiple merchants. The AgenticCommerce app integrates with it via deep linking.

## Architecture

```
┌─────────────────────────────────────┐
│   AgenticCommerce Mobile App        │
│   (Merchant Shopping App)            │
├─────────────────────────────────────┤
│  ✅ Product Search & Shopping        │
│  ✅ Cart Management                  │
│  ✅ Checkout Flow                    │
│  ✅ Calls Mandate Service API        │
│  ✅ Deep Links to Mandate App        │
│  ❌ NO Built-in Mandate UI           │
└─────────────────────────────────────┘
           │
           │ API Call: Check Mandate
           │ Deep Link: mandate://mandate/{id}
           ▼
┌─────────────────────────────────────┐
│   Mandate Mobile App                │
│   (Independent Authorization App)   │
├─────────────────────────────────────┤
│  ✅ Add/Manage Merchants             │
│  ✅ Add/Manage AI Agents             │
│  ✅ View All Mandates                │
│  ✅ Approve/Reject Mandates          │
│  ✅ Sign Mandates (Secure Element)   │
│  ✅ Signature Pad                    │
│  ✅ Biometric Authentication         │
│  ✅ Deep Link Handling               │
└─────────────────────────────────────┘
           │
           │ API Calls
           ▼
┌─────────────────────────────────────┐
│   Mandate Service Backend            │
│   (Railway - Backend API)            │
└─────────────────────────────────────┘
```

## Mandate App Features

### 1. **Dashboard Screen**
- Overview of all mandates (pending, active, revoked)
- Quick stats
- Quick actions to manage merchants/agents

### 2. **Mandates Screen**
- List all mandates with filtering (all, pending, active, revoked)
- Tap to view mandate details
- Pull to refresh

### 3. **Mandate Detail Screen**
- View full mandate information
- Approve pending mandates (with signature)
- Revoke active mandates
- See signature status

### 4. **Merchants Screen**
- List all registered merchants
- Add new merchants
- View merchant details

### 5. **Agents Screen**
- List all registered AI agents
- Add new agents
- Manage agent capabilities

### 6. **Login Screen**
- Simple user ID-based login
- Stores user in local storage

## Deep Linking Flow

### When User Checks Out in AgenticCommerce:

1. **User clicks "Checkout"** in AgenticCommerce app
2. **App checks for payment mandate** via API call to mandate service
3. **No mandate found?**
   - App calls `registerPaymentMandate()` which:
     - Creates mandate in mandate service (status: `pending`)
     - Opens Mandate app via deep link: `mandate://mandate/{mandateId}`
4. **Mandate app opens** to the specific mandate detail screen
5. **User reviews mandate** and signs:
   - Draws signature on SignaturePad
   - Biometric authentication (Face ID/Touch ID/Fingerprint)
   - Secure Element signing
6. **User approves mandate** → Status changes to `active`
7. **User returns to AgenticCommerce** app
8. **Checkout proceeds** (mandate now exists and is active)

## Deep Link Format

```
mandate://mandate/{mandateId}
```

Example:
```
mandate://mandate/123e4567-e89b-12d3-a456-426614174000
```

## Code Structure

### Mandate App (`apps/mandate-app/`)

```
apps/mandate-app/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── MandatesScreen.tsx
│   │   ├── MandateDetailScreen.tsx
│   │   ├── MerchantsScreen.tsx
│   │   └── AgentsScreen.tsx
│   ├── components/
│   │   └── SignaturePad.tsx
│   ├── services/
│   │   ├── mandate-service.client.ts
│   │   ├── secure-element.service.ts
│   │   ├── signature.service.ts
│   │   ├── public-key.service.ts
│   │   ├── test-key-generator.ts
│   │   └── storage.service.ts
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── MandateContext.tsx
│   └── navigation/
│       └── RootNavigator.tsx
├── app.json (with deep link scheme)
└── package.json
```

### AgenticCommerce App Updates (`apps/mobile/`)

**Removed:**
- ❌ `MandateSigningModal` usage in CheckoutScreen
- ❌ Built-in mandate signing UI

**Added:**
- ✅ `apps/mobile/src/utils/deepLink.ts` - Deep linking utility
- ✅ Updated `mandateCheck.ts` - Now opens Mandate app instead of showing modal
- ✅ Updated `CheckoutScreen.tsx` - Calls mandate service and triggers deep link

## Key Files

### 1. Deep Linking (`apps/mobile/src/utils/deepLink.ts`)
```typescript
openMandateApp(mandateId: string): Promise<boolean>
```
- Opens Mandate app with deep link
- Handles app not installed scenario
- Shows appropriate alerts

### 2. Mandate Check (`apps/mobile/src/utils/mandateCheck.ts`)
```typescript
checkPaymentMandate(agentId, agentName): Promise<{hasMandate, mandateId}>
registerPaymentMandate(agentId, agentName, constraints): Promise<{mandateId}>
```
- Checks for existing mandate
- Registers new mandate and opens Mandate app

### 3. Mandate App Navigation (`apps/mandate-app/src/navigation/RootNavigator.tsx`)
- Handles deep link: `mandate://mandate/{mandateId}`
- Navigates to MandateDetailScreen with mandateId

### 4. Mandate Detail Screen (`apps/mandate-app/src/screens/MandateDetailScreen.tsx`)
- Shows mandate details
- Signature pad for signing
- Approve/Revoke actions
- Secure Element integration

## Configuration

### Mandate App (`app.json`)
```json
{
  "scheme": "mandate",
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "data": [
          {
            "scheme": "mandate",
            "host": "mandate"
          }
        ]
      }
    ]
  }
}
```

### AgenticCommerce App
- No special configuration needed
- Uses `Linking.openURL()` to open Mandate app

## User Flow Example

### Scenario: First-time Checkout

1. User adds items to cart in AgenticCommerce
2. User clicks "Checkout"
3. AgenticCommerce checks for payment mandate → **Not found**
4. AgenticCommerce:
   - Creates mandate (status: `pending`)
   - Opens Mandate app: `mandate://mandate/{mandateId}`
5. Mandate app opens to mandate detail screen
6. User:
   - Reviews mandate terms
   - Draws signature
   - Authenticates with biometric
   - Clicks "Approve & Sign"
7. Mandate status changes to `active`
8. User returns to AgenticCommerce
9. User clicks "Checkout" again
10. AgenticCommerce checks mandate → **Found and active**
11. Payment proceeds ✅

## Benefits

1. **Separation of Concerns**: Shopping app vs Authorization app
2. **Multi-Merchant Support**: One app manages all authorizations
3. **Security**: Centralized mandate management
4. **User Control**: Users see all authorizations in one place
5. **Scalability**: Easy to add new merchants/agents
6. **Compliance**: Better audit trail

## Next Steps

1. Build Mandate app APK using EAS
2. Test deep linking on physical devices
3. Deploy both apps to app stores
4. Test end-to-end flow

## Testing Deep Links

### Android (ADB)
```bash
adb shell am start -W -a android.intent.action.VIEW -d "mandate://mandate/test-mandate-id" com.agentic.mandate
```

### iOS (Simulator)
```bash
xcrun simctl openurl booted "mandate://mandate/test-mandate-id"
```

## API Integration

### AgenticCommerce → Mandate Service
- `GET /api/mandates?userId=xxx&type=payment` - Check mandate
- `POST /api/mandates/register` - Register mandate

### Mandate App → Mandate Service
- `GET /api/merchants` - List merchants
- `POST /api/merchants` - Add merchant
- `GET /api/ai-agent-apps` - List agents
- `POST /api/ai-agent-apps` - Add agent
- `GET /api/mandates?userId=xxx` - Get user mandates
- `POST /api/mandates/:id/approve` - Approve mandate
- `POST /api/signatures/create` - Create signature

## Summary

✅ **Mandate App**: Complete with all screens, services, and deep linking
✅ **AgenticCommerce Integration**: Updated to call mandate service and trigger deep links
✅ **Deep Linking**: Fully implemented between apps
✅ **Secure Element**: Integrated for hardware-backed signing
✅ **Multi-Merchant Support**: Can manage multiple merchants and agents

The system is now ready for testing and deployment!
