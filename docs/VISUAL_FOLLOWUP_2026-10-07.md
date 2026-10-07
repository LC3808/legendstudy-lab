# Visual / checkout entry follow-up — 2026-10-07

Base authority: LAB main `f7f05f5`; Wiki main `4ebd222`. Owner-approved IA, names,
copy, footer and Pricing section order preserved. No MY redesign in this delta.

## Checkout role analysis (before implementation)

| Role | Existing authority | Decision |
| --- | --- | --- |
| A: SKU selection and display | PaymentCheckout / PlanCard / pricingPlans | Render the same controller in Pricing; no second selection screen. |
| B: order creation | `call("orders", { sku, request_key })` | Reuse unchanged server contract and per-SKU sessionStorage key; rotate only on existing stale-order response. |
| C: SDK initialization | existing official Toss v2 loader / requestPayment | Reuse; no new SDK/key/provider or architecture. |
| D: buyer/session validation | existing runtime + checkoutOpen; getSession at order request; server authorization | Preserve all gates; no client authority over price/buyer. |
| E: success/failure URLs | server checkout snapshot | Pass through unchanged; no callback/confirm change. |

Pricing now renders the existing PaymentCheckout in embedded form. A selected
pack's pay action directly creates the existing order and requests Toss. The
`/payments/checkout/` route stays available for direct links/fallback. Anonymous
login returns to Pricing with the selected SKU; no automatic payment after login.
Next router query + leaf Suspense avoids static hydration/soft-navigation loss.
Synchronous in-flight guard prevents duplicate clicks; server idempotency remains
authoritative. Order/SDK errors remain retryable in the same screen.

## Visual changes

Warm neutral canvas, white surfaces, subtle shared borders/shadows, restrained
brand accents (`--brand: #ffac14` unchanged). Home graphic placed on one surface;
three LAB cards and connected-data panel separate sections, centered closing CTA.
No extra illustrations/diagram. Both score LABs share a centered hero card and APP
copy. Essay intro/catalog surfaces harmonized; EssayCreditStatus and functions intact.
CSS is scoped to these public pages; MY, auth policy, callback/backend unchanged.

## Verification

- lint/typecheck, 313 tests / 28 files, boundary audit PASS.
- Static build, secret/readiness and exported-link audits PASS.
- Local 96 responsive conditions (12 pages ×4 widths ×100%/200% text) PASS.
- Local intercepted browser: Pricing → official SDK entry contract at all 8 responsive
  conditions; authenticated buyer, server snapshot and guest login/SKU retention PASS.
  No external payment transaction was sent; this is not a new Production Toss E2E.
- Screenshots reviewed for Home, centered score LABs and Essay/Pricing surfaces.
- Final main/deployment/live evidence is recorded in the Unified Wiki closeout.

PAYMENT_BACKEND_CHANGED: NO. No Functions/runtime/mode/keys/finance/schema/RPC/
confirm/cancel/migration/signing changes. No new Production payment or LIVE activation.
