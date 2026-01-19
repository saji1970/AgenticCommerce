# Hardware-Secured Mandate Signing Implementation Guide

## Overview

This document describes the implementation of hardware-secured mandate signing using Secure Element (iOS Secure Enclave / Android StrongBox) with biometric authentication and digital signatures.

## Architecture

### Components

1. **Database Schema**
   - `user_public_keys` - Stores public keys from Secure Element
   - `mandate_signatures` - Stores signed mandate data with digital signatures
   - `agent_mandates.signature_id` - Links mandates to signatures

2. **Backend Services**
   - `PublicKeyRepository` - Manages user public keys
   - `SignatureRepository` - Manages mandate signatures
   - `SignatureVerificationService` - Verifies digital signatures using crypto

3. **API Endpoints**
   - `POST /api/signatures/keys/register` - Register public key
   - `GET /api/signatures/keys?userId=xxx` - Get user's public keys
   - `POST /api/signatures/create` - Create mandate signature
   - `POST /api/signatures/:id/verify` - Verify signature
   - `GET /api/signatures/mandate/:mandateId` - Get signature for mandate

4. **Frontend UI**
   - Signature pad component (canvas-based)
   - Mandate display modal
   - Biometric prompt integration (mobile app)

5. **Mobile App Integration**
   - Secure Element key generation
   - Biometric authentication
   - Digital signature generation

## Flow

### 1. Initial Setup (First Time)

```
User opens app → Generate key pair in Secure Element → 
Extract public key → Register with backend → Store keyId locally
```

### 2. Mandate Signing Flow

```
User views mandate → Draw signature on pad → 
Biometric/PIN authentication → Secure Element signs hash → 
Send signature to backend → Backend verifies → Mandate approved
```

### 3. Signature Verification

```
Backend receives signature → Get public key → 
Verify signature using crypto → Update status → Link to mandate
```

## Implementation Details

### Database Migration

Run migration `004_create_user_keys_and_signatures.sql`:

```bash
cd apps/mandate-service
psql $DATABASE_URL -f migrations/004_create_user_keys_and_signatures.sql
```

### Backend API Usage

#### Register Public Key

```typescript
POST /api/signatures/keys/register
{
  "userId": "user-uuid",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n...",
  "keyId": "unique-key-id",
  "keyAlgorithm": "ECDSA-P256",
  "deviceId": "device-uuid",
  "attestationData": { ... }
}
```

#### Create Signature

```typescript
POST /api/signatures/create
{
  "mandateId": "mandate-uuid",
  "userId": "user-uuid",
  "publicKeyId": "key-id",
  "mandateText": "Full mandate text...",
  "mandateHash": "sha256-hash",
  "signatureData": "base64-signature",
  "signatureImageUrl": "https://...",
  "signatureTimestamp": "2026-01-18T...",
  "deviceInfo": { ... },
  "biometricType": "face"
}
```

### Mobile App Integration

#### iOS (Swift)

```swift
import LocalAuthentication
import CryptoKit

// Generate key in Secure Enclave
let accessControl = SecAccessControlCreateWithFlags(
    kCFAllocatorDefault,
    kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    [.privateKeyUsage, .biometryAny],
    nil
)

let attributes: [String: Any] = [
    kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
    kSecAttrKeySizeInBits as String: 256,
    kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
    kSecPrivateKeyAttrs as String: [
        kSecAttrIsPermanent as String: true,
        kSecAttrAccessControl as String: accessControl!
    ]
]

var error: Unmanaged<CFError>?
let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error)

// Sign data
let dataToSign = Data(mandateHash.utf8)
var error: Unmanaged<CFError>?
let signature = SecKeyCreateSignature(
    privateKey!,
    .ecdsaSignatureMessageX962SHA256,
    dataToSign as CFData,
    &error
)
```

#### Android (Kotlin)

```kotlin
import android.security.keystore.KeyGenParameterSpec
import java.security.KeyPairGenerator
import javax.crypto.Cipher

// Generate key in StrongBox
val keyPairGenerator = KeyPairGenerator.getInstance(
    KeyProperties.KEY_ALGORITHM_EC,
    "AndroidKeyStore"
)

val keyGenParameterSpec = KeyGenParameterSpec.Builder(
    "mandate_key",
    KeyProperties.PURPOSE_SIGN
)
    .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
    .setDigests(KeyProperties.DIGEST_SHA256)
    .setUserAuthenticationRequired(true)
    .setUserAuthenticationValidityDurationSeconds(60)
    .setIsStrongBoxBacked(true) // Use StrongBox if available
    .build()

keyPairGenerator.initialize(keyGenParameterSpec)
val keyPair = keyPairGenerator.generateKeyPair()

// Sign data
val signature = Signature.getInstance("SHA256withECDSA")
signature.initSign(keyPair.private)
signature.update(mandateHash.toByteArray())
val signatureBytes = signature.sign()
```

### Frontend Signature Pad

The signature pad is implemented as a canvas-based component:

```html
<canvas id="signature-pad" width="600" height="300"></canvas>
<button onclick="clearSignature()">Clear</button>
<button onclick="saveSignature()">Save</button>
```

JavaScript:
```javascript
let canvas = document.getElementById('signature-pad');
let ctx = canvas.getContext('2d');
let isDrawing = false;

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

function startDrawing(e) {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
}

function stopDrawing() {
  isDrawing = false;
}

function getSignatureImage() {
  return canvas.toDataURL('image/png');
}
```

## Security Considerations

1. **Hardware Attestation**: Verify that keys are generated in genuine Secure Element
2. **Biometric Binding**: Keys can only be used after biometric/PIN authentication
3. **Hash Verification**: Always verify the hash matches the mandate text + timestamp
4. **Key Revocation**: Support revoking compromised keys
5. **Signature Expiry**: Consider time-based signature validity

## Testing

1. Test key generation in Secure Element
2. Test signature creation with biometric auth
3. Test signature verification on backend
4. Test key revocation
5. Test signature expiry

## Next Steps

1. ✅ Database schema created
2. ✅ Backend repositories and services created
3. ✅ API endpoints created
4. ⏳ Frontend signature pad (in progress)
5. ⏳ Mobile app Secure Element integration
6. ⏳ Hardware attestation verification
