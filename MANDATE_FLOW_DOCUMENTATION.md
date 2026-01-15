# Mandate Flow Documentation

This document explains the complete flow of how mandates are called and used in the Android app.

## 📋 Overview

Mandates are permissions that users grant to AI agents to perform actions on their behalf (cart operations, purchase intents, payments). The app manages mandates through a context provider that loads, caches, and manages mandate state.

## 🔄 Complete Flow

### 1. **App Initialization**

```
App.tsx
  └─> MandateProvider (wraps app)
      └─> useEffect on mount
          └─> loadMandates()
              └─> mandateService.getMyMandates()
                  └─> GET /api/mandates
                      └─> Backend: MandateController.getUserMandates()
                          └─> MandateService.getUserMandates()
                              └─> MandateRepository.getUserMandates()
```

**Code Location:**
- `apps/mobile/App.tsx` - Wraps app with MandateProvider
- `apps/mobile/src/contexts/MandateContext.tsx:52-64` - Auto-loads on mount and app state changes

### 2. **Loading Mandates**

**Frontend Flow:**
1. `MandateContext.loadMandates()` is called
2. Calls `mandateService.getMyMandates()`
3. API call: `GET /api/mandates` with optional query params (`?status=active&type=cart`)
4. Response structure: `{ success: true, data: Mandate[] }`
5. Frontend extracts `response.data.data` (array of mandates)
6. Caches active mandates by type in `activeMandates` state

**Backend Flow:**
1. Route: `GET /api/mandates` (requires authentication)
2. Controller: `MandateController.getUserMandates()`
3. Service: `MandateService.getUserMandates(userId, status?, type?)`
4. Repository: `MandateRepository.getUserMandates(userId, status?, type?)`
5. Returns: Array of mandates from database

**Code Locations:**
- Frontend: `apps/mobile/src/contexts/MandateContext.tsx:69-111`
- Frontend Service: `apps/mobile/src/services/mandate.service.ts:32-40`
- Backend Route: `apps/backend/src/routes/mandate.routes.ts:18`
- Backend Controller: `apps/backend/src/controllers/mandate.controller.ts:29-51`
- Backend Service: `apps/backend/src/services/mandate.service.ts:47-53`

### 3. **Creating a Mandate**

**Trigger:** When user clicks "Buy" or "Create Intent" button and no active mandate exists

**Frontend Flow:**
1. `BuyButton` or `IntentButton` component renders
2. `MandateFlowManager` checks for active mandate
3. If no mandate: Shows `MandateSigningModal`
4. User signs mandate
5. `MandateContext.createMandate()` is called
6. API call: `POST /api/mandates` with mandate data
7. Auto-approves mandate: `POST /api/mandates/:id/approve`
8. Reloads mandates to update cache

**Backend Flow:**
1. Route: `POST /api/mandates` (requires authentication + validation)
2. Controller: `MandateController.createMandate()`
3. Service: `MandateService.createMandate(userId, request)`
   - Validates constraints based on type
   - Creates mandate in database
   - Logs agent action
4. Returns: Created mandate

**Code Locations:**
- Frontend: `apps/mobile/src/contexts/MandateContext.tsx:124-152`
- Frontend Component: `apps/mobile/src/components/mandate/MandateFlowManager.tsx:62-80`
- Backend Controller: `apps/backend/src/controllers/mandate.controller.ts:11-27`
- Backend Service: `apps/backend/src/services/mandate.service.ts:22-41`

### 4. **Using Mandates**

**When user wants to buy a product:**
1. `BuyButton` component checks for active `cart` mandate
2. `MandateFlowManager` uses `getActiveMandateByType('cart')`
3. If mandate exists: Proceeds with cart operation
4. If no mandate: Shows signing modal

**When user wants to create intent:**
1. `IntentButton` component checks for active `intent` mandate
2. `MandateFlowManager` uses `getActiveMandateByType('intent')`
3. If mandate exists: Proceeds with intent creation
4. If no mandate: Shows signing modal

**Code Locations:**
- `apps/mobile/src/components/products/BuyButton.tsx`
- `apps/mobile/src/components/products/IntentButton.tsx`
- `apps/mobile/src/components/mandate/MandateFlowManager.tsx:37-57`

## 🔌 API Endpoints

### GET /api/mandates
**Purpose:** Get all mandates for the authenticated user

**Query Parameters:**
- `status` (optional): Filter by status (pending, active, suspended, revoked, expired)
- `type` (optional): Filter by type (cart, intent, payment)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "agentId": "string",
      "agentName": "string",
      "type": "cart" | "intent" | "payment",
      "status": "pending" | "active" | "suspended" | "revoked" | "expired",
      "constraints": { ... },
      "validFrom": "2025-01-01T00:00:00Z",
      "validUntil": "2025-12-31T23:59:59Z",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/mandates
**Purpose:** Create a new mandate

**Request Body:**
```json
{
  "agentId": "string",
  "agentName": "string",
  "type": "cart" | "intent" | "payment",
  "constraints": {
    // Cart constraints
    "maxItemValue": 500,
    "maxItemsPerDay": 10,
    "allowedCategories": ["Electronics"]
    
    // OR Intent constraints
    "maxIntentValue": 2000,
    "maxIntentsPerDay": 5,
    "autoApproveUnder": 100,
    "expiryHours": 48
    
    // OR Payment constraints
    "maxTransactionAmount": 1000,
    "dailySpendingLimit": 2000
  },
  "validUntil": "2025-12-31T23:59:59Z" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* mandate object */ }
}
```

### POST /api/mandates/:id/approve
**Purpose:** Approve a pending mandate

**Response:**
```json
{
  "success": true,
  "data": { /* updated mandate object */ }
}
```

### POST /api/mandates/:id/suspend
**Purpose:** Suspend an active mandate

### POST /api/mandates/:id/revoke
**Purpose:** Revoke a mandate

**Request Body:**
```json
{
  "reason": "User requested revocation"
}
```

## 🎯 Key Components

### MandateContext
- **Location:** `apps/mobile/src/contexts/MandateContext.tsx`
- **Purpose:** Global state management for mandates
- **Features:**
  - Auto-loads mandates on app start
  - Caches active mandates by type
  - Provides methods to create, approve, revoke mandates
  - Reloads mandates when app comes to foreground

### MandateFlowManager
- **Location:** `apps/mobile/src/components/mandate/MandateFlowManager.tsx`
- **Purpose:** Orchestrates mandate checking and creation flow
- **Features:**
  - Automatically checks for active mandate
  - Shows signing modal if no mandate exists
  - Handles mandate creation and approval

### BuyButton / IntentButton
- **Locations:**
  - `apps/mobile/src/components/products/BuyButton.tsx`
  - `apps/mobile/src/components/products/IntentButton.tsx`
- **Purpose:** UI buttons that require mandates
- **Features:**
  - Uses `MandateFlowManager` to ensure mandate exists
  - Proceeds with action once mandate is ready

## 🔍 Debugging Checklist

### Mandates not loading?
1. ✅ Check if user is authenticated (token in storage)
2. ✅ Check API base URL in `apps/mobile/src/services/api.ts`
3. ✅ Check backend logs for `/api/mandates` requests
4. ✅ Verify authentication middleware is working
5. ✅ Check network connectivity

### Mandates not being created?
1. ✅ Check if `MandateProvider` wraps the app
2. ✅ Verify `createMandate` is called with correct params
3. ✅ Check backend validation errors
4. ✅ Verify constraints match mandate type
5. ✅ Check backend logs for creation errors

### Active mandates not found?
1. ✅ Check if mandates are loaded (`loadMandates()` called)
2. ✅ Verify mandate status is "active"
3. ✅ Check if mandate is expired (`validUntil` date)
4. ✅ Verify mandate type matches what's being requested
5. ✅ Check `activeMandates` cache in context

## 📊 Data Flow Diagram

```
User Action (Buy/Intent)
    │
    ├─> BuyButton/IntentButton
    │       │
    │       └─> MandateFlowManager
    │               │
    │               ├─> getActiveMandateByType(type)
    │               │       │
    │               │       └─> Check activeMandates cache
    │               │
    │               ├─> If no mandate:
    │               │       │
    │               │       └─> Show MandateSigningModal
    │               │               │
    │               │               └─> User signs
    │               │                       │
    │               │                       └─> createMandate()
    │               │                               │
    │               │                               ├─> POST /api/mandates
    │               │                               ├─> POST /api/mandates/:id/approve
    │               │                               └─> loadMandates() (refresh cache)
    │               │
    │               └─> If mandate exists:
    │                       │
    │                       └─> onMandateReady() callback
    │                               │
    │                               └─> Proceed with action
```

## 🚀 Testing the Flow

### Test 1: Load Mandates on App Start
1. Open app
2. Check console logs for `GET /api/mandates` request
3. Verify mandates are loaded in context

### Test 2: Create Mandate
1. Click "Buy" button on a product
2. If no mandate: Modal should appear
3. Sign the mandate
4. Verify mandate is created and approved
5. Check that action proceeds

### Test 3: Use Existing Mandate
1. Ensure active mandate exists
2. Click "Buy" button
3. Action should proceed immediately (no modal)

### Test 4: Mandate Expiration
1. Create mandate with short expiration
2. Wait for expiration
3. Try to use mandate
4. Should prompt for new mandate

## 📝 Notes

- Mandates are automatically reloaded when app comes to foreground
- Active mandates are cached for quick access
- Mandates are auto-approved after creation
- Expired mandates are filtered out automatically
- All mandate operations require authentication

