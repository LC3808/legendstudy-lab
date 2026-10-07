# Toss REVIEW confirm closeout — 2026-10-07

Scope: payment return and expired checkout only. Base main d018d78 includes UI
09db4c2 and the newer Owner axis-label correction. No APP repository, UI markup,
Cloudflare configuration, credential, SQL migration, finance role or LIVE change.

Evidence before deployment:
- Reviewer-only DB read: 3 TEST ORDER_CREATED / NONE / NULL orders; all expired.
- Existing local finance token read-only payment_process(get nonexistent UUID)
  returns PT404 ORDER_NOT_FOUND, not401. No token minted or binding changed.
- Current Supabase2.116 getSession already awaits initializePromise. A fresh
  Production success page with an existing orderId and NO paymentKey restores
  login and completes status, then correctly rejects missing payment information.
  Thus a pure hydration race is NOT established as the live root cause.
- Baseline regression reproduces failure on a temporarily-null session and the
  misleading shared401 message; these are synthetic reproductions, not proof of
  the original incident. Updated code waits at most3s, never retries mutation,
  and serializes callback execution. Local absence and HTTP stage are distinct.
- Checkout rotates the pack request key once only on server409
  ORDER_NOT_CHECKOUT_READY. Other errors do not create another order.
- pnpm verify PASS:256 tests/23files +lint/typecheck/boundaries/static build.
  Static scan PASS; finance token/Toss secret ABSENT. No provider call in tests.

Production deploy and Owner TEST payment/DB assertions remain to be recorded.
CARD_REVIEW_READY:NO. TOSS_EMAIL_READY:NO until PAID/TEST_RECORDED/NULL and
CONFIRM SUCCEEDED with payment-attributable spendable delta0 are verified.

## Closeout 2 — actual HTTP401, 2026-10-07

Latest Owner order 3533567e-ea7d-4846-bbd9-f4381e2ba0a4:
TEST / ORDER_CREATED / NONE / grant NULL; operation count0.
Production function source independently confirms payment_process raises PT401
before operation creation when essay_private.uid() is NULL. Therefore zero
operations alone does not prove the finance RPC was never invoked.
Reviewer rejection is403; confirm401 can arise at request Authorization validation
or a buyer/finance RPC. Add bounded REVIEW-only RPC401 stage/code diagnostics;
no upstream message or credential is returned. Actual runtime source pending.
Success UI now requires PAID with TEST_RECORDED or LIVE/POSTED; failure retains
manual retry and account navigation. All existing Home/Nav changes preserved.
Verification:264 tests PASS, lint/typecheck/boundary PASS, Node22 build PASS.
The pnpm fallback build hit a local port sandbox limit; direct Node22 same build
succeeded. No credential/config/schema/provider changes.

## Final known-good evidence — 2026-10-07

Owner restored the existing Production finance binding; no new token/signing.
Fresh order7ae63803-b544-47ef-9264-29c5ad562eed independently read from Production:
PAID / TEST_RECORDED / grant_id NULL / TEST / CONFIRM SUCCEEDED(exactly1).
Payment-linked grants0, payment-attributable spendable delta0, real chargeNO.
Public runtime REVIEW/TEST; LIVE paymentNO. Owner verified success→essay LAB.
Root401 was remote payment_process finance JWT rejection PGRST301, not buyer
session hydration. Existing binding restoration resolved it.

Final presentation-only polish: brand completion card/check icon, canonical
quantity/amount purchase summary and essay/account CTA. TEST copy never claims
Credit issuance; LIVE issuance still requires PAID/POSTED. Optional LIVE balance
omitted because the current response has no authoritative balance. No new API call.
278tests/lint/typecheck/boundary/build PASS. No backend/config/keys/schema changes.
Known-good payment runtime frozen. No more payment transactions required.
Card review TEST evidence ready; external approval remains external; no email sent.
