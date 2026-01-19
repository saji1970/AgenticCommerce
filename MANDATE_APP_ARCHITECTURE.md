# Mandate App Architecture - Updated

## Overview

The system now consists of **two separate mobile apps**:

1. **AgenticCommerce App** - Merchant shopping app (uses AI agents)
2. **Mandate App** - Independent mandate management app (manages authorizations)

## Architecture

```
┌─────────────────────────────────────┐
│   AgenticCommerce Mobile App       │
│   (Merchant Shopping App)           │
├─────────────────────────────────────┤
│  ✅ Product Search & Shopping        │
│  ✅ Cart Management                  │
│  ✅ Payment Processing               │
│  ❌ NO Mandate UI (removed)          │
│  ✅ Calls Mandate Service API        │
└─────────────────────────────────────┘
           │
           │ API Calls (check mandates)
           ▼
┌─────────────────────────────────────┐
│   Mandate Service Backend            │
│   (Railway - Backend API)            │
├─────────────────────────────────────┤
│  ✅ Mandate API                     │
│  ✅ Merchant Management API         │
│  ✅ AI Agent App Management API    │
│  ✅ Signature Verification          │
│  ✅ Public Key Management           │
│  ✅ Admin UI (Web)                  │
└─────────────────────────────────────┘
           ▲
           │ API Calls (manage mandates)
           │
┌─────────────────────────────────────┐
│   Mandate Mobile App                │
│   (Independent App)                  │
├─────────────────────────────────────┤
│  ✅ Add/Manage Merchants             │
│  ✅ Add/Manage AI Agents             │
│  ✅ View All Mandates                │
│  ✅ Approve/Reject Mandates          │
│  ✅ Sign Mandates (Secure Element)   │
│  ✅ Signature Pad                    │
│  ✅ Biometric Authentication         │
│  ✅ Manage Authorizations            │
└─────────────────────────────────────┘
```

## Mandate App Features

### 1. Merchant Management
- **Add Merchant**: Register new merchant apps
- **List Merchants**: View all registered merchants
- **Edit Merchant**: Update merchant details
- **Delete Merchant**: Remove merchant registration

### 2. AI Agent Management
- **Add Agent**: Register new AI agents
- **List Agents**: View all registered agents
- **Edit Agent**: Update agent details
- **Delete Agent**: Remove agent registration

### 3. Mandate Management
- **View Mandates**: See all mandates from all merchants/agents
- **Pending Mandates**: Review mandates awaiting approval
- **Active Mandates**: View active authorizations
- **Approve Mandate**: Approve and sign mandates
- **Revoke Mandate**: Revoke existing authorizations
- **Suspend Mandate**: Temporarily suspend mandates

### 4. Secure Signing
- **Signature Pad**: Draw signature on screen
- **Biometric Auth**: Face ID/Touch ID/Fingerprint
- **Secure Element**: Hardware-backed key generation
- **Digital Signatures**: Cryptographic proof of intent

## AgenticCommerce App Changes

### Removed Features
- ❌ Mandate signing UI (moved to Mandate App)
- ❌ Signature pad component (moved to Mandate App)
- ❌ Mandate management screens (moved to Mandate App)

### Remaining Features
- ✅ Product search and shopping
- ✅ Cart management
- ✅ Checkout flow
- ✅ API calls to mandate service (check mandate status)
- ✅ Redirect to Mandate App for signing (if needed)

## User Flow

### Scenario: User wants to checkout in AgenticCommerce

1. **User adds items to cart** (AgenticCommerce App)
2. **User clicks "Checkout"** (AgenticCommerce App)
3. **App checks for payment mandate** (API call to mandate service)
4. **No mandate found?**
   - Option A: Show message "Please approve mandate in Mandate App"
   - Option B: Deep link to Mandate App with mandate request
5. **User opens Mandate App**
   - Views pending mandate request
   - Reviews mandate details
   - Signs mandate (with Secure Element)
6. **Mandate approved**
7. **User returns to AgenticCommerce App**
8. **Checkout proceeds** (mandate now exists)

## API Integration

### AgenticCommerce App → Mandate Service
- `GET /api/mandates?userId=xxx&type=payment` - Check for mandate
- `POST /api/mandates/register` - Register new mandate (if merchant does it)
- `GET /api/mandates/:id` - Get mandate details

### Mandate App → Mandate Service
- `GET /api/merchants` - List all merchants
- `POST /api/merchants` - Add merchant
- `GET /api/ai-agent-apps` - List all agents
- `POST /api/ai-agent-apps` - Add agent
- `GET /api/mandates?userId=xxx` - Get user's mandates
- `POST /api/mandates/:id/approve` - Approve mandate
- `POST /api/mandates/:id/revoke` - Revoke mandate
- `POST /api/signatures/create` - Create signature
- `POST /api/signatures/keys/register` - Register public key

## Installation

### For End Users

**Two separate apps**:
1. **AgenticCommerce** - For shopping
2. **Mandate Manager** - For managing authorizations

### For Developers

**Two separate codebases**:
- `apps/mobile/` - AgenticCommerce shopping app
- `apps/mandate-app/` - Mandate management app

**Two separate builds**:
- AgenticCommerce APK
- Mandate Manager APK

## Benefits of Separation

1. **Independence**: Mandate app works with multiple merchant apps
2. **Security**: Centralized authorization management
3. **User Control**: Users manage all authorizations in one place
4. **Scalability**: Easy to add new merchants/agents
5. **Compliance**: Better audit trail and compliance tracking

## Next Steps

1. ✅ Create mandate app structure
2. ⏳ Copy Secure Element services
3. ⏳ Create merchant management screens
4. ⏳ Create agent management screens
5. ⏳ Create mandate management screens
6. ⏳ Create navigation structure
7. ⏳ Remove mandate UI from AgenticCommerce app
8. ⏳ Update AgenticCommerce to only call API
