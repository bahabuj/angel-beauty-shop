# Task rewrite-2: Rewrite Frontend Checkout Flow for Clover Hosted Checkout

## Agent: main

## Task Summary
Rewrote the entire frontend checkout flow to use Clover Hosted Checkout, removing all mock payment UI (card forms, payment selectors, simulated payment processing).

## Files Modified

### 1. `src/components/pages/checkout-page.tsx` — COMPLETE REWRITE
- **Removed**: CardPaymentForm, PaymentSelector imports, multi-step flow, card data collection
- **Added**: Single-step checkout with shipping info form + Clover hosted checkout redirect
- **States**: 'info' | 'redirecting' | 'error'
- **Flow**: Fill info → "Proceed to Secure Payment — $XX" → POST /api/orders → POST /api/clover/checkout → redirect to redirectUrl
- **Error handling**: Distinguishes requiresConfig (amber Settings icon) vs general errors (red AlertTriangle)

### 2. `src/components/pages/checkout-failed-page.tsx` — NEW FILE
- Red XCircle with framer-motion spring animation
- "Payment Failed" + "No charge has been made"
- Order reference card (if orderId available)
- Amber warning box with common failure reasons
- Three buttons: Try Again, Back to Cart, Continue Shopping
- Staggered entrance animations

### 3. `src/components/pages/order-success-page.tsx` — COMPLETE REWRITE
- Verifies payment before showing success (fetches order from /api/orders/{orderId})
- Uses useState initializer for orderId from URL search params
- Four phases: 'loading' | 'no-order' | 'error' | 'success'
- Success shows full order details: invoice number, items, totals, "Paid" badge
- Error state has refresh button to re-verify payment

### 4. `src/app/api/clover/checkout/route.ts` — REWRITTEN
- Removed all simulated payment logic (Math.random, setTimeout, 95% success rate)
- Real Clover Hosted Checkout API integration when env vars configured
- CLOVER_DEMO_MODE=true for development (simulates paid order + redirect)
- Returns { requiresConfig: true } when not configured (no demo mode)
- Returns { success: true, redirectUrl, sessionId } on success

### 5. `src/store/nav-store.ts` — MINOR UPDATE
- Added 'checkout-failed' to Page type union

## Lint Result
0 errors, 0 warnings
