# 2026-10-08 read-only Payment / deletion audit

No payment, Toss, signing, finance credential, worker, deletion function or migration
was changed. This report does not authorize follow-up implementation or live tests.

A. Alleged `record_payment_webhook_event -> confirm_payment_order` identity path:
**SAFE for the reviewed canonical source path; Production function body parity confirmed by Owner hash inventory.**
The actual LAB Cloudflare gateway (`cloudflare/payments.ts`, called by
`functions/api/payments/[[path]].ts`) exposes no webhook action and calls neither named
function. Buyer ownership is checked via payment_order using the browser bearer;
privileged payment_process uses the existing finance token with gateway authorization.
It does not reuse a service-role caller as an auth.uid()-owned buyer. Unknown/deployed
external webhook configuration is NOT_ASSESSABLE from repository code, so this does
not prove safety of an unreviewed separate webhook deployment.

B. Pending payment vs deletion:
**CONFIRMED_GAP in source for atomicity across provider HTTP; hosted race NOT_TESTED.**
payment_order and a new confirm_begin lock/fence the subject; Cloudflare then calls Toss
outside the database transaction. A deletion request can occur after this check and
before the provider confirm finishes. This is not an atomic distributed transaction.
LIVE confirm_finish rechecks account_private.allowed and raises
PAID_REQUIRES_REFUND_RECONCILIATION before credit_post_grant; no new purchase grant is
permitted after the lifecycle fence. Provider success can therefore coexist with a
reconciliation-required order. TEST confirm_finish intentionally records TEST_RECORDED
without a credit grant and does not contain that LIVE-only final fence. An existing
operation's confirm_begin retry is also not a new authorization grant; the gateway
still calls buyer payment_order first. These guards do not prove provider settlement
cannot race deletion. Canonical deletion PERSONAL/postconditions hashes matched Owner
inventory; Owner also confirmed exact Payment bodies: payment_order 2bebb9fbd77a49e68851fa6e7c14f6c6, payment_process e1bd04077bda3cf606cb880f4f70b1a9 (essay_executor, SECURITY DEFINER, empty search_path). This confirms source parity, not execution of a live race.

No paid transactions, deletion actions or provider requests were used for this audit.
Any policy or implementation change for the reconciliation gap requires separate Owner
scope; it is intentionally outside MY/Application/Study foundation.
