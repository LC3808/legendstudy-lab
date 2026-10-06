# Toss card review path — LAB web

Status: code ready, deployment and credentials pending Owner action.
Owner-facing only: this document describes the merchant/card review path for the web
purchase. It is not a consumer page and it is not referenced from `/pricing/`.

## What the reviewer walks

| Step | Surface | What it shows |
| --- | --- | --- |
| 1 | `https://lab.legendstudy.com/` | Brand and service direction (already live) |
| 2 | `/pricing/` | Pack price, what a Credit covers, validity, purchase guide, refund summary |
| 3 | `/pricing/` card CTA | `구매하기` — becomes a real link once the payment runtime is configured |
| 4 | `/payments/checkout/?sku=…` | Pack selection and order confirmation |
| 5 | `/payments/checkout/` `결제하기` | Official Toss payment window (`js.tosspayments.com/v2/standard`) |
| 6 | `/payments/success/`, `/payments/fail/` | Server-side confirmation of the result |
| 7 | Business information | `/pricing/` footer block, `/support/`, `/terms/`, `/refund/` |

Steps 2, 3 and 7 are live in Production today. Steps 4 to 6 are in this branch and
require the Owner actions below before Production can serve them.

## Safety invariants the path keeps

The browser is never a payment authority. It sends a SKU and a request key; the
server creates the order, owns the amount, owns the redirect targets and owns the
Credit grant. `scripts/verify-boundaries.mjs` rejects a checkout component that
reintroduces a price, a quantity or a privileged capability, and
`scripts/test-payment-workerd.mjs` runs the real payment Worker in workerd with
every outbound call intercepted — in both TEST and LIVE mode — and asserts that
provider redirects are never followed.

A TEST runtime opens the official payment window, charges nothing and can never
produce a spendable Credit; the server refuses that combination. `/pricing/` shows
an active purchase control only for a runtime the backend reports as configured, so
a stale static export cannot advertise a purchase that cannot complete.

## Owner actions before the reviewer can pay

The LAB Production Pages project needs the payment environment. The payment backend
refuses to start with any of these missing (`PAYMENT_NOT_CONFIGURED`, HTTP 503):

| Variable | Value |
| --- | --- |
| `PAYMENT_MODE` | `TEST` for review, `LIVE` to sell |
| `PAYMENT_ENABLED` | `true` when purchases should be accepted, `false` to pause |
| `PAYMENT_ORIGIN` | `https://lab.legendstudy.com` |
| `PAYMENT_SUPABASE_URL` | `https://stlhijzpjfgwwdgunlsd.supabase.co` |
| `PAYMENT_SUPABASE_PUBLISHABLE_KEY` | the project's `sb_publishable_…` key |
| `PAYMENT_FINANCE_TOKEN` | the `essay_finance`-mapped capability token |
| `PAYMENT_SUPPORT_SUBJECTS` | comma-separated auth user UUIDs allowed on `/payments/support/` |
| `TOSS_MID` | `leglabn24k` |
| `TOSS_TEST_CLIENT_KEY`, `TOSS_TEST_SECRET_KEY` | Toss TEST pair (`test_ck_…`, `test_sk_…`) for review |
| `TOSS_LIVE_CLIENT_KEY`, `TOSS_LIVE_SECRET_KEY` | Toss LIVE pair (`live_ck_…`, `live_sk_…`) for selling |

Two further prerequisites are not environment variables:

1. **Production database.** `payment_orders`, `payment_operations` and
   `payment_events` are absent from the Production project (`stlhijzpjfgwwdgunlsd`),
   so the additive payment migration has to be applied there. Measured 2026-10-06;
   see the note below on how absence was established.
2. **Finance capability.** The `essay_finance` credential described in the unified
   wiki is not provisioned in Production. Without it the payment Worker cannot post
   orders, and Math synthetic funding is blocked by the same item.

## Measured Production state (2026-10-06, read-only)

| Check | Result |
| --- | --- |
| `/`, `/pricing/`, `/refund/`, `/terms/`, `/privacy/`, `/support/`, `/account-deletion/`, `/account/` | HTTP 200 |
| `/payments/checkout/`, `/payments/test/` | HTTP 404 — not deployed |
| `/pricing/` purchase control | four `<button … disabled>구매하기` controls (no runtime configured) |
| `payment_orders` / `payment_operations` / `payment_events` in Production Supabase | absent (`PGRST205`) |
| `credit_accounts` / `credit_grants` / `credit_transactions` / `profiles` | present (permission denied under RLS, which proves the table exists) |

Method note: the PostgREST OpenAPI root needs a secret key, and a `404 PGRST202` on
`rpc/<name>` cannot distinguish a missing function from a parameter mismatch.
Direct table reads — `PGRST205` versus a permission error — are the reliable test,
and that is what the table above records.

## Verification for this path

| Gate | Result |
| --- | --- |
| `pnpm verify` (lint, typecheck, tests, boundary audit, static export) | PASS — 242 tests |
| `node scripts/test-payment-workerd.mjs <miniflare>` | PASS — redirect handling plus TEST and LIVE runtime suites |
| Built routes | `out/payments/{checkout,test,success,fail,support}/index.html`, all `noindex` |

The local workerd run needs a `miniflare` build whose bundled `workerd` supports the
project's compatibility date; the version currently published as a stable release is
older than that date, so the alpha line was used for the local run.