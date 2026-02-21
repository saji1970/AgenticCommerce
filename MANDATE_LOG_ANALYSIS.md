# Mandate Log Analysis

## Captured Logs Summary

Logs were captured via `adb logcat -s ReactNativeJS:V` and saved to `mandate-debug-logs.txt`.

### Flow Observed (Intent Button)

1. **User pressed Intent** for product: `College of Charleston Athletics Clear Bag Policy` (id: 656b7085-c74b-4a66-a775-8a9ba362b366)

2. **MandateFlowManager** found existing intent mandate: `2eaebd59-0f2a-4c03-9543-99ee5f9ec17a`
   - Agent: Price Tracker AI (created Jan 15, 2026)
   - Status: active

3. **Deep link opened** with correct intentData:
   - Product: College of Charleston Athletics Clear Bag Policy ✓
   - agentName: Shopping Assistant ✓

4. **Mandate app received** correct intent data and displayed it

### Potential "Old Mandate" Causes

| Scenario | What happens | Status |
|----------|--------------|--------|
| **Intent flow** | Uses existing intent mandate (Price Tracker AI) but passes current product in intentData | ✓ Logs show correct product |
| **Cart flow (Buy Now)** | Uses existing cart mandate, passes cartData with current product | Not captured – try Buy Now to verify |
| **Opening from Mandate list** | Tapping a mandate card passes only `mandateId` – no cartData/intentData | Product section empty (expected) |

### Agent Mismatch (Intent)

- **Existing mandate**: Price Tracker AI (`price-tracker-ai`)
- **Current flow**: Shopping Assistant (from Shopping app)
- The mandate type is `intent` – one active intent mandate is reused across agents. The **product** in intentData is correct.

### To Capture Cart (Buy Now) Logs

```powershell
adb logcat -c
# Tap Buy Now on a product, then:
adb logcat -s ReactNativeJS:V -d -v time > cart-debug-logs.txt
```

Look for:
- `[BuyButton] Pressed for product:`
- `[MandateFlowManager] Active mandate exists:` (cart mandate ID)
- `[deepLink] Opening Mandate app with URL:` (cartData in URL?)
- Mandate app: `Cart data from deep link:`

### Biometric Error (Non-blocking)

```
'Error getting biometric type:', [TypeError: Cannot read property 'FaceID' of undefined]
```

This is a known React Native / Android issue when `react-native-keychain` or similar checks FaceID (iOS-only). It does not block the flow.
