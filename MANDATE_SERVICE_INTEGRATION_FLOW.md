# Mandate Service Integration Flow

This document explains how the AgenticCommerce mobile app integrates with the mandate service for mandate management and user signing.

## Architecture Overview

```
AgenticCommerce Mobile App
    ↓
Mandate Service Client (API calls)
    ↓
Mandate Service Backend (Railway)
    ├── Mandate Management API
    ├── Signature API (Secure Element)
    └── Admin UI (Web interface)
```

## Flow Diagram

```
User Action (e.g., Checkout)
    ↓
Check for Mandate (mandateCheck.ts)
    ↓
No Mandate Found?
    ↓ YES
Show MandateSigningModal
    ↓
User Reviews & Signs
    ├── Draw Signature (SignaturePad)
    ├── Biometric Auth (Secure Element)
    └── Create Signature (signatureService)
    ↓
Register Mandate (mandateServiceClient)
    ↓
Approve Mandate (mandateServiceClient)
    ↓
Mandate Active → Proceed with Transaction
```

## Integration Points

### 1. Mandate Service Client

**File**: `apps/mobile/src/services/mandate-service.client.ts`

**Purpose**: HTTP client for calling mandate service API

**Base URL**:
- Development: `http://10.0.2.2:3001/api`
- Production: `https://pure-wonder-production.up.railway.app/api`

**Key Methods**:
```typescript
// Register a new mandate
registerMandate(data: RegisterMandateRequest): Promise<AgentMandate>

// Get user's mandates
getUserMandates(userId: string, status?: string, type?: string): Promise<AgentMandate[]>

// Approve a pending mandate
approveMandate(mandateId: string, userId: string): Promise<AgentMandate>

// Validate mandate for transaction
validateMandate(data: ValidateMandateRequest): Promise<{ valid: boolean; mandate?: any }>
```

### 2. Mandate Check Utility

**File**: `apps/mobile/src/utils/mandateCheck.ts`

**Purpose**: Check if user has active mandate before transactions

**Usage Example**:
```typescript
import { checkPaymentMandate, registerPaymentMandate } from '../utils/mandateCheck';

// Check for payment mandate
const result = await checkPaymentMandate(agentId, agentName);

if (result.needsRegistration) {
  // Show mandate signing modal
  const mandate = await registerPaymentMandate(agentId, agentName, constraints);
  // Then approve it
  await approveMandate(mandate.id);
}
```

### 3. Mandate Signing Modal

**File**: `apps/mobile/src/components/mandate/MandateSigningModal.tsx`

**Purpose**: UI component for mandate review and signing

**Features**:
- Displays mandate details (agent, type, constraints)
- Signature pad for visual signature
- Secure Element integration (if `mandateId` provided)
- Biometric authentication
- Agreement checkbox

**Usage**:
```typescript
<MandateSigningModal
  visible={showModal}
  onClose={() => setShowModal(false)}
  onSign={handleSignMandate}
  mandateType={MandateType.PAYMENT}
  agentName="AgenticCommerce AI"
  constraints={constraints}
  mandateId={mandate.id} // Optional: enables Secure Element signing
/>
```

### 4. Signature Service

**File**: `apps/mobile/src/services/signature.service.ts`

**Purpose**: Create and manage mandate signatures with Secure Element

**Key Methods**:
```typescript
// Create signature for mandate
createSignature(request: CreateSignatureRequest): Promise<MandateSignature>

// Get signature for mandate
getSignatureByMandate(mandateId: string): Promise<MandateSignature | null>

// Verify signature
verifySignature(signatureId: string): Promise<boolean>
```

**Flow**:
1. Ensure public key is registered
2. Generate mandate hash
3. Sign with Secure Element (biometric auth)
4. Send signature to mandate service
5. Backend verifies signature

### 5. Secure Element Service

**File**: `apps/mobile/src/services/secure-element.service.ts`

**Purpose**: Manage cryptographic keys and biometric authentication

**Key Methods**:
```typescript
// Get or create key pair
getOrCreateKeyPair(): Promise<KeyPair>

// Authenticate with biometric
authenticate(reason: string): Promise<boolean>

// Sign data with Secure Element
signData(data: string, reason: string): Promise<SigningResult>
```

## Complete Flow Example: Payment Mandate

### Step 1: User Tries to Checkout

```typescript
// In CheckoutScreen.tsx
const handleCheckout = async () => {
  // Check for payment mandate
  const mandateCheck = await checkPaymentMandate(
    defaultAgent.id,
    defaultAgent.name
  );

  if (mandateCheck.needsRegistration) {
    // Show mandate signing modal
    setShowMandateModal(true);
  } else {
    // Proceed with checkout
    processPayment();
  }
};
```

### Step 2: Show Mandate Signing Modal

```typescript
// Register mandate first
const mandate = await registerPaymentMandate(
  agentId,
  agentName,
  constraints
);

// Show modal with mandateId for Secure Element signing
<MandateSigningModal
  visible={true}
  mandateId={mandate.id} // Enables Secure Element signing
  onSign={handleSignMandate}
  // ... other props
/>
```

### Step 3: User Signs Mandate

```typescript
// In MandateSigningModal.tsx
const handleSign = async () => {
  if (mandateId) {
    // Secure Element signing flow
    // 1. Ensure public key registered
    await publicKeyService.registerPublicKey();
    
    // 2. Create signature
    await signatureService.createSignature({
      mandateId,
      mandateText: getMandateText(),
      signatureImageUrl: signatureData,
    });
    
    // 3. Approve mandate
    await onSign(); // Calls approveMandate
  }
};
```

### Step 4: Approve Mandate

```typescript
// In mandateCheck.ts
export async function approveMandate(mandateId: string): Promise<AgentMandate> {
  const user = await storageService.getUser();
  const userId = user.id;
  
  // Call mandate service API
  return await mandateServiceClient.approveMandate(mandateId, userId);
}
```

### Step 5: Mandate Service Processes

**Backend Flow** (`apps/mandate-service/src/controllers/mandate.controller.ts`):

1. **Receive approval request**: `POST /api/mandates/:id/approve`
2. **Update mandate status**: `pending` → `active`
3. **Link signature** (if provided)
4. **Return updated mandate**

## API Endpoints Used

### Mandate Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/mandates/register` | Register new mandate |
| GET | `/api/mandates?userId=xxx` | Get user mandates |
| GET | `/api/mandates/:id` | Get specific mandate |
| POST | `/api/mandates/:id/approve` | Approve mandate |
| POST | `/api/mandates/:id/suspend` | Suspend mandate |
| POST | `/api/mandates/:id/revoke` | Revoke mandate |
| POST | `/api/mandates/validate` | Validate mandate for transaction |

### Signature Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/signatures/keys/register` | Register public key |
| GET | `/api/signatures/keys?userId=xxx` | Get user's public keys |
| POST | `/api/signatures/create` | Create mandate signature |
| POST | `/api/signatures/:id/verify` | Verify signature |
| GET | `/api/signatures/mandate/:mandateId` | Get signature for mandate |

## Components Integration

### CheckoutScreen

**File**: `apps/mobile/src/screens/cart/CheckoutScreen.tsx`

**Flow**:
1. User clicks "Checkout"
2. Check for payment mandate
3. If missing, show `MandateSigningModal`
4. After signing, proceed with payment

### MandateFlowManager

**File**: `apps/mobile/src/components/mandate/MandateFlowManager.tsx`

**Purpose**: Manages mandate flow for different mandate types

**Flow**:
1. Check if mandate exists
2. If not, show signing modal
3. Handle signing process
4. Update mandate status

## Secure Element Signing Flow

### When `mandateId` is Provided

1. **User draws signature** on `SignaturePad`
2. **User clicks "Sign with Secure Element"**
3. **Biometric authentication** (Face ID/Touch ID/Fingerprint/PIN)
4. **Secure Element signs** the mandate hash
5. **Signature sent** to mandate service
6. **Backend verifies** signature
7. **Mandate approved** and linked to signature

### Test Mode (No Hardware Required)

- Test keys are used automatically
- Biometric auth is simulated
- Signatures are accepted by backend in test mode
- Full flow works for demo purposes

## Configuration

### Environment URLs

**Development**:
```typescript
// apps/mobile/src/services/mandate-service.client.ts
const MANDATE_SERVICE_URL = 'http://10.0.2.2:3001/api';
```

**Production**:
```typescript
const MANDATE_SERVICE_URL = 'https://pure-wonder-production.up.railway.app/api';
```

### Test Mode

**Enabled by default** in `apps/mobile/src/services/secure-element.service.ts`:
```typescript
const USE_TEST_KEYS = __DEV__ || true; // Enabled for demo
```

## Error Handling

### Common Errors

1. **No mandate found**: Show signing modal
2. **Mandate expired**: Show signing modal for renewal
3. **Signature verification failed**: Show error, allow retry
4. **Biometric auth failed**: Show error, allow PIN fallback
5. **Network error**: Show error, allow retry

## Best Practices

1. **Always check for mandate** before transactions
2. **Show clear UI** when mandate is required
3. **Handle errors gracefully** with retry options
4. **Cache mandate status** to reduce API calls
5. **Validate mandate** before each transaction
6. **Use Secure Element** for production (test mode for demo)

## Testing

### Test Mandate Flow

1. Clear app data (to remove existing mandates)
2. Try to checkout
3. Mandate modal should appear
4. Sign mandate with test keys
5. Mandate should be approved
6. Checkout should proceed

### Test Signature Flow

1. Sign a mandate with `mandateId` provided
2. Draw signature
3. Biometric auth (simulated in test mode)
4. Signature should be created
5. Mandate should be linked to signature

## Detailed Flow: Checkout with Payment Mandate

### Step-by-Step Process

#### 1. User Initiates Checkout

```typescript
// CheckoutScreen.tsx - useEffect on mount
useEffect(() => {
  checkMandateBeforePayment();
}, []);

const checkMandateBeforePayment = async () => {
  const defaultAgent = AppConfig.getDefaultAgent();
  
  // Call mandate service to check for active mandate
  const mandateCheck = await checkPaymentMandate(
    defaultAgent.id,
    defaultAgent.name
  );
  
  if (mandateCheck.needsRegistration) {
    // Show mandate signing modal
    setShowMandateModal(true);
  } else {
    // Mandate exists, allow checkout
    setMandateCheckComplete(true);
  }
};
```

#### 2. Mandate Check Implementation

```typescript
// mandateCheck.ts
export async function checkPaymentMandate(
  agentId: string,
  agentName?: string
): Promise<MandateCheckResult> {
  const user = await storageService.getUser();
  const userId = user.id;
  
  // API Call to mandate service
  const mandates = await mandateServiceClient.getUserMandates(
    userId, 
    'active', 
    'payment'
  );
  
  // Find active mandate for this agent
  const activeMandate = mandates.find(
    m => m.agentId === agentId && m.status === 'active'
  );
  
  return {
    hasMandate: !!activeMandate,
    mandate: activeMandate,
    needsRegistration: !activeMandate
  };
}
```

**API Call**: `GET /api/mandates?userId=xxx&status=active&type=payment`

#### 3. Register Mandate (If Needed)

```typescript
// CheckoutScreen.tsx
const handleRegisterMandate = async () => {
  const defaultAgent = AppConfig.getDefaultAgent();
  const defaultConstraints = AppConfig.getDefaultConstraints('payment');
  
  // Step 1: Register mandate with mandate service
  const mandate = await registerPaymentMandate(
    defaultAgent.id,
    defaultAgent.name,
    defaultConstraints
  );
  
  // Step 2: Store pending mandate for approval
  setPendingMandate(mandate);
  
  // Step 3: Approve the mandate
  await approveMandate(mandate.id);
  
  // Step 4: Close modal and proceed
  setShowMandateModal(false);
  setMandateCheckComplete(true);
};
```

**API Calls**:
1. `POST /api/mandates/register` - Creates mandate with status 'pending'
2. `POST /api/mandates/:id/approve` - Approves mandate (status → 'active')

#### 4. Secure Element Signing (If mandateId Provided)

```typescript
// MandateSigningModal.tsx - When mandateId is provided
const handleSign = async () => {
  if (mandateId) {
    // 1. Ensure public key registered
    const hasKey = await publicKeyService.hasRegisteredKey();
    if (!hasKey) {
      await publicKeyService.registerPublicKey();
    }
    
    // 2. Create signature with Secure Element
    await signatureService.createSignature({
      mandateId,
      mandateText: getMandateText(),
      signatureImageUrl: signatureData,
    });
    
    // 3. Approve mandate
    await onSign();
  }
};
```

**API Calls**:
1. `POST /api/signatures/keys/register` - Register public key (if needed)
2. `POST /api/signatures/create` - Create signature with Secure Element
3. `POST /api/mandates/:id/approve` - Approve mandate

#### 5. Signature Creation Flow

```typescript
// signature.service.ts
async createSignature(request: CreateSignatureRequest) {
  // 1. Get user's public keys
  const keys = await publicKeyService.getUserPublicKeys();
  const activeKey = keys[0];
  
  // 2. Generate mandate hash
  const timestamp = new Date().toISOString();
  const mandateHash = this.generateMandateHash(
    request.mandateText, 
    timestamp
  );
  
  // 3. Sign with Secure Element (triggers biometric auth)
  const signingResult = await secureElementService.signData(
    mandateHash,
    'Sign mandate to authorize AI agent'
  );
  
  // 4. Send to mandate service
  await this.client.post('/signatures/create', {
    mandateId: request.mandateId,
    userId: user.id,
    publicKeyId: activeKey.keyId,
    mandateText: request.mandateText,
    mandateHash,
    signatureData: signingResult.signature,
    signatureImageUrl: request.signatureImageUrl,
    signatureTimestamp: signingResult.timestamp,
    deviceInfo: { platform: Platform.OS, version: Platform.Version },
    biometricType: signingResult.biometricType,
  });
}
```

**API Call**: `POST /api/signatures/create`

**Backend Processing**:
1. Validates mandate exists
2. Validates public key exists and belongs to user
3. Verifies signature (or accepts in test mode)
4. Creates signature record
5. Links signature to mandate
6. Auto-verifies signature

## Complete API Flow Diagram

```
Mobile App                    Mandate Service API
    |                                 |
    |-- GET /mandates?userId=xxx ---->|
    |<-- [mandate list] --------------|
    |                                 |
    |-- POST /mandates/register ----->|
    |<-- [new mandate] ---------------|
    |                                 |
    |-- POST /signatures/keys/register>|
    |<-- [public key registered] -----|
    |                                 |
    |-- POST /signatures/create ----->|
    |   (with Secure Element sig)     |
    |<-- [signature created] ---------|
    |                                 |
    |-- POST /mandates/:id/approve -->|
    |<-- [mandate approved] ----------|
    |                                 |
```

## UI Components Flow

### MandateSigningModal States

1. **Initial State**: Shows mandate details, constraints, legal text
2. **Signature Required**: Shows signature pad (if `mandateId` provided)
3. **Signing State**: Shows loading indicator during signing
4. **Success State**: Closes modal, proceeds with transaction

### User Interaction Flow

```
User sees mandate modal
    ↓
Reviews mandate details
    ↓
Draws signature (if Secure Element enabled)
    ↓
Clicks "Sign Mandate" or "Sign with Secure Element"
    ↓
Biometric authentication (if Secure Element)
    ↓
Signature created and sent to backend
    ↓
Mandate approved
    ↓
Modal closes, transaction proceeds
```

## Summary

The AgenticCommerce app integrates with the mandate service through:

1. **API Client** (`mandateServiceClient`) - HTTP calls to mandate service
2. **Utilities** (`mandateCheck.ts`) - Check and register mandates
3. **UI Components** (`MandateSigningModal`) - User interface for signing
4. **Services** (`signatureService`, `secureElementService`) - Secure Element integration
5. **Backend** (mandate-service on Railway) - Mandate and signature management

The flow is seamless: when a mandate is needed, the app automatically shows the signing UI, handles Secure Element authentication, and completes the mandate registration process.

### Key Integration Points

- **Checkout Flow**: Automatically checks for payment mandate
- **Mandate Registration**: Creates mandate via API, then approves it
- **Secure Element Signing**: Optional but recommended for production
- **Test Mode**: Works without hardware for demo purposes
- **Error Handling**: Graceful fallbacks and retry mechanisms
