# Manual Test: Adding 2 Products (Different Flows)

This test verifies that adding two different products via Buy Now and Create Intent flows correctly shows the right product in the Mandate app each time.

**Automated unit tests** for the URL/cartData flow: `apps/mobile/src/__tests__/addTwoProductsFlow.test.ts`  
Run: `cd apps/mobile && pnpm test`

## Prerequisites

- Shopping app (Agentic Commerce) installed
- Mandate app installed
- Device/emulator with both apps
- Logged in with same user in both apps (or use deep link auto-login)

---

## Test 1: Buy Now – Product A, then Product B

### Step 1: Add first product (Product A)

1. Open **Shopping app**
2. Search or browse to find **Product A** (e.g., "Paper Towels" or any product)
3. Tap **Buy Now** on Product A
4. Mandate app opens

**Verify:**
- [ ] Mandate app shows **Product A** name in "Adding to cart" / "Items to Purchase"
- [ ] Product A price is correct
- [ ] You see **"Confirm & Return to Shopping"** (if mandate already active) or **"Approve & Authorize Payment"** (if new mandate)

5. Tap **Confirm & Return to Shopping** (or Approve if new mandate)
6. Return to Shopping app

**Verify:**
- [ ] Product A is in the cart
- [ ] Success message shows Product A name

### Step 2: Add second product (Product B) – different product

1. Stay in Shopping app
2. Search or browse to find **Product B** (different from Product A, e.g., "Leather Bag")
3. Tap **Buy Now** on Product B
4. Mandate app opens

**Verify:**
- [ ] Mandate app shows **Product B** (not Product A)
- [ ] Product B name, price correct
- [ ] No stale Product A data

5. Tap **Confirm & Return to Shopping**
6. Return to Shopping app

**Verify:**
- [ ] Both Product A and Product B are in the cart
- [ ] Success message shows Product B name

---

## Test 2: Create Intent – Product A, then Product B

### Step 1: Create intent for Product A

1. Open **Shopping app**
2. Find **Product A**
3. Tap **Create Intent** (⭐) on Product A
4. Mandate app opens

**Verify:**
- [ ] Mandate app shows **Product A** in "Purchase Intent Approval"
- [ ] Product A name, price, max price correct

5. Tap **Confirm Intent & Return** (or Approve if new mandate)
6. Return to Shopping app

### Step 2: Create intent for Product B

1. Find **Product B**
2. Tap **Create Intent** on Product B
3. Mandate app opens

**Verify:**
- [ ] Mandate app shows **Product B** (not Product A)
- [ ] Product B details correct

---

## Test 3: Mixed flow – Buy Now then Create Intent

1. Tap **Buy Now** on Product A → Mandate app shows Product A ✓
2. Confirm and return
3. Tap **Create Intent** on Product B → Mandate app shows Product B ✓
4. Confirm and return

**Verify:** Each time the correct product is shown.

---

## Test 4: Rapid sequence (stress)

1. Buy Now Product A → Confirm
2. Immediately Buy Now Product B → Confirm
3. Check cart has both A and B
4. Verify no product mix-up in Mandate app during step 2

---

## Capture logs (optional)

```powershell
adb logcat -c
# Perform Test 1 (Buy A, then Buy B)
adb logcat -s ReactNativeJS:V -d -v time > add-two-products-logs.txt
```

Check logs for:
- `[BuyButton] Pressed for product:` – correct product IDs
- `[deepLink] Opening Mandate app with URL:` – cartData contains correct product
- `Cart data from deep link:` – Mandate app received correct product

---

## Pass criteria

- [ ] Product A shown when adding Product A
- [ ] Product B shown when adding Product B (no Product A)
- [ ] Cart contains both products after both flows
- [ ] Confirm & Return works for both products
- [ ] No "old mandate" / wrong product displayed
