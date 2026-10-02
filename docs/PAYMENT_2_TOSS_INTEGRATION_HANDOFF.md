# PAYMENT-2 — Toss Payments integration handoff

Status: **LAB Phase A implemented / deterministic verified; official documentation/Sandbox provider TEST verified; merchant E2E not run.**
No deployment, Production DB apply, LIVE call or financial write. Public pricing stays
PAYMENT_NOT_READY; a separate `/payments/test/` screen is ready for approved TEST configuration.

APP binding authority explicitly pinned by Owner: `e4836eda919c6c9dbf524026c68255f308c3c776`,
`20261003000100_payment_foundation.sql`, SHA-256
`be808d9625729bac336446d07d92460d57286cfec30f0c29f9135fd70ce1f643`.
The later APP provider-neutral pre-apply amendment (`3b3b869`) has a different hash.
This LAB implementation neither rolls APP back nor selects a Production migration artifact.
Before any future apply, Owner must select the intended exact APP revision/hash. Both DTOs
are compatible with this consumer: optional provider, if present, must be TOSS.

## What PAYMENT-1B already established

| Item | Location | Notes |
| --- | --- | --- |
| Public pricing page | `src/app/pricing/page.tsx` → `/pricing/` | Public, indexable, no login required |
| Refund policy page | `src/app/refund/page.tsx` → `/refund/` | Owner commercial policy; `LEGAL_REVIEW_RECOMMENDED` |
| Prices, terms and refund rules | `src/lib/pricing.ts` | Single source of truth; covered by `src/lib/pricing.test.ts` |
| Payment CTA state | `paymentState.cta = "PAYMENT_NOT_READY"` | Buttons are disabled; no purchase can be faked |
| Promotion code shell | `src/components/pricing-promo-form.tsx` | Input renders; submit is blocked and disabled |

The pricing page is **presentation only**. It must never become financial
authority: the browser-supplied price, Credit quantity or product id must never
be trusted by the server.

## Where the server side belongs

The site is a Next.js static export (`output: "export"`, `trailingSlash: true`)
served by Cloudflare Pages, and it already uses Pages Functions for the Kakao
OIDC exchange:

```
functions/api/auth/kakao/start.ts
functions/api/auth/kakao/callback.ts
public/_routes.json   # include: ["/api/auth/kakao/*"]
```

A future payment backend therefore belongs under `functions/api/payments/*`
and must be added to `public/_routes.json` `include` so Pages routes the
requests to Functions instead of the static asset handler.

Secrets are Cloudflare Pages environment bindings, never `NEXT_PUBLIC_*`
values and never committed. `scripts/verify-boundaries.mjs` already fails the
build if a secret-like token appears anywhere under `src/`, and it rejects any
`"use client"` file that imports from `functions/`.

## Responsibilities for PAYMENT-2

1. **Payment request** — create an order, hand the client an order id and amount.
2. **Order id generation** — server-generated, unguessable, single use.
3. **Amount and product verification** — recompute the amount server-side from
   the package id (1 / 3 / 5 / 10 Credits). Never accept a client total.
4. **Toss success callback** — receive the redirect/return payload from the
   checkout and validate the state before doing anything else.
5. **Server-side payment confirmation** — confirm the payment with the provider
   using the secret key, inside a Function only.
6. **Credit grant** — grant Credits via the server-authoritative entitlement
   path. `CreditEntitlement.authority` is already typed as
   `"FUTURE_SERVER_AUTHORITATIVE"` in `src/types/domain.ts`.
7. **Idempotency** — the result must be stable when a callback, a retry and a
   webhook all arrive for the same order. Grant Credits exactly once.
8. **Payment record** — persist order, provider reference, amount, product,
   status, grant outcome and timestamps.
9. **Cancellation and partial cancellation** — full cancel for an unused order,
   partial cancel for the refund formula below.
10. **Refund reconciliation** — keep the internal payment record and the
    provider's cancel result consistent.
11. **Webhook and event handling** — reconcile asynchronous provider events with
    the same idempotency keys as the synchronous path.
12. **Secret management** — separate test and live keys, per-environment
    bindings, rotation without a deploy of client code.
13. **Test and live separation** — server configuration admits only TEST keys. A separately approved Production-hosted review may run TEST; it never grants spendable Credits.
14. **Error recovery** — determine which failures may be retried, and never
    grant Credits for a payment that did not reach a confirmed state.

## Refund arithmetic (must stay identical to the published policy)

```
unused            : refund = paid amount
partially used    : refund = paid amount - (used Credits × 4,900)
all Credits used  : refund = 0
```

Consumed Credits are deducted at the 1 Credit full price of **4,900원**, never
at the discounted pack rate. The published example is 10 Credits / 29,900원 with
5 Credits used → **5,400원**. `calculatePartialRefundKrw()` in
`src/lib/pricing.ts` encodes the same arithmetic and is the reference the server
implementation should match.

A Credit counts as used once a valid initial evaluation has been normally
provided. Whether the included reevaluation was later used does not change the
used-Credit count, and the included reevaluation is never a second used Credit.
A failed or provider-errored evaluation that produced no valid result must not
be treated as consumed.

## Public release context

RELEASE-1 published the Owner-approved business/legal data and effective date 2026-10-03.
Current `business-info.ts`, `legal-documents.ts` and public policy pages remain unchanged.
The historical PAYMENT-1B pending-business notes have been superseded by RELEASE-1.
LIVE requires a fresh actual-data-flow Privacy review and separate Owner authorization.

## Forward compatibility: evaluation result screen

The evaluation result screen is **not** implemented in PAYMENT-1B. When it is
built, its reevaluation call to action must match the rule already published on
`/pricing/`:

- CTA: `답안을 다시 작성해 보세요.`
- Credit note: `14일 이내 재첨삭에는 Credit이 추가로 차감되지 않습니다.`

These strings live in `evaluationResultCtaPolicy` in `src/lib/pricing.ts`, next
to the 14-day reevaluation window they depend on, so the future screen and the
pricing page cannot drift apart.

## Implemented physical server contract

Cloudflare Pages Functions catch-all: `functions/api/payments/[[path]].ts`, implementation
`cloudflare/payments.ts`. `/api/payments/*` alone is added beside Kakao in `_routes.json`.
Next remains static export. No database, wallet, payment state store or pricing copy is added in LAB.
APP is the only economic/order authority. No APP source/migration changes in this task.

All endpoints POST JSON (max 2048 bytes), exact keys, same configured Origin and bearer
Supabase session. Unknown method/body/field/mode fails closed. UUIDs validated. No cookies
are payment authority. Normal APP ownership/lifecycle checks run on each call/retry.

| Endpoint | Exact body | Operation |
| --- | --- | --- |
| orders | sku, request_key | authenticated payment_order.create; checkout uses returned snapshot |
| status | id | authenticated payment_order.get; no provider call |
| confirm | id, request_key, payment_key, amount | owner get; stored amount comparison; confirm_begin; Toss lookup/confirm; confirm_finish |
| reconcile | id | owner get; finance get; provider lookup; finish original pending operation |
| cancel | id, request_key | owner get plus verified support subject; cancel_begin; provider lookup/cancel; cancel_finish |

sku: 1c/3c/5c/10c. Browser cannot set owner, amount at creation, quantity, provider, mode,
refund amount, coupon, or redirect. Callback amount is only compared against APP snapshot.
`payment_order` uses the buyer JWT. `payment_process` uses the separately provisioned finance
capability. This is NOT service-role fallback. The finance credential must already map to
`essay_finance` and a non-null approved server subject as required by APP; do not mint one
from browser claims or grant new role membership from LAB.

User response `{order}` is an explicit allowlist projection of APP payment-v1, excluding
operation IDs, provider payment key, consumed/refund internals and finance identity. Order
create also returns `{checkout}`: public TEST clientKey, opaque order UUID customerKey,
server orderId/name/amount, fixed configured-origin `/payments/success/` and `/payments/fail/`.
No buyer email/name/phone/address is sent. Only official TEST client key can reach browser.

Cancel is deliberately a bounded support harness, not a self-service refund UI: caller must
be in PAYMENT_SUPPORT_SUBJECTS **and own the dedicated synthetic order**. Arbitrary customer
order refunds/statutory exceptions remain later operational scope. Reconciliation of an
already authorized pending cancellation may be requested by that order's owner.

Errors are sanitized: PAYMENT_NOT_CONFIGURED, ORIGIN_DENIED, METHOD_NOT_ALLOWED,
CONTENT_TYPE, AUTH_REQUIRED, BODY_TOO_LARGE, INVALID_BODY/FIELDS/FIELD/ID,
UNSUPPORTED_SKU, NOT_FOUND, ORDER_REQUEST_REJECTED, INVALID_ORDER, AMOUNT_MISMATCH,
SUPPORT_REQUIRED, RECONCILIATION_REQUIRED. No provider exception/payload/log is exposed.
Post-provider errors always return RECONCILIATION_REQUIRED and attempt UNKNOWN persistence.
Never classify a timeout as definitive rejection or independently retry Credit grant.

## Toss method and recovery

Official SDK V2 standard payment window (`https://js.tosspayments.com/v2/standard`),
`TossPayments(clientKey).payment({customerKey}).requestPayment({method:"CARD",...})`.
Official REST `/v1/payments/{paymentKey}`, `/v1/payments/confirm`,
`/v1/payments/{paymentKey}/cancel`. API version path v1 is distinct from SDK V2.
References checked for this implementation:
- https://docs.tosspayments.com/sdk/v2/js/environment
- https://docs.tosspayments.com/reference
- https://docs.tosspayments.com/guides/v2/get-started/environment

Every provider response must match paymentKey/orderId/MID/KRW/totalAmount. TEST-secret
boundary establishes provider environment. DONE plus valid approvedAt and full balance
is required for confirmation. Only exact canonical cancellation amount, completed cancellation
entry and expected remaining balance can finish cancellation. Partial availability is checked.
Only one cancellation is supported by the current APP general-refund contract. No partial
refund arithmetic is duplicated here; APP's 29,900−5×4,900=5,400 remains authority.

Provider lookup precedes retry; IN_PROGRESS may confirm using the original durable APP
provider idempotency key. DONE recovers a lost local finish. Cancellation repeats reuse its
original key; previously CANCELED/PARTIAL_CANCELED is reconciled by verified facts.
Provider/local/network ambiguity remains pending/UNKNOWN; no financial fence is guessed away.
Failures may need authorized support reconciliation, not blind rejection. No automatic retry
loop. Exact browser confirm key is order UUID within operation scope. Creation retries keep
session request key; explicit new-order button creates a new intent after cancellation/expiry.

Webhook is staged: no unauthenticated event endpoint. Current synchronous card TEST scope
uses owner-authorized lookup/reconcile on callback refresh and explicit recheck. Before LIVE,
review verified webhook wake-up and scheduled/support reconciliation for abandoned callbacks.
Events must never assert finish without authoritative provider lookup.

## TEST isolation and consumer screens

`/payments/test/`: normal login, 1/3/5/10 product selection, clear no-charge/no-spendable-Credit
label. Server config/auth are security boundaries; route obscurity is not relied upon.
`/payments/success/`: URL is not proof; status/confirm/reconcile before success message.
After completion only orderId is retained in URL. `/payments/fail/`: no provider/RPC mutation,
no raw provider error display. No ordinary Pricing CTA activation, main merge or deploy.
All three pages are noindex and no-referrer. A later approved review release can link to TEST.

TEST API rejects non-TEST APP results and any spendable POSTED grant result. APP TEST records
are TEST_RECORDED/REVOKED, never Ledger grants. LAB never calls credit tables or grant helpers.
The existing DB uniqueness, transaction/concurrency and cancellation fencing proof belongs to
APP's Owner package. LAB tests mock that contract; they are not a fresh deployed DB proof.

## Configuration gate — Owner enters values directly, never in chat

Cloudflare dashboard → Workers & Pages → **the LAB Pages project** → Settings → Variables
and Secrets → **Preview** environment for the feature branch first. Production scope stays
disabled until a separate reviewer deployment authorization. No bindings were changed here.

| Name | Kind / required value policy |
| --- | --- |
| PAYMENT_MODE | variable, exactly TEST; missing/unknown/LIVE rejected |
| PAYMENT_ORIGIN | exact HTTPS preview origin (later lab.legendstudy.com only if approved) |
| PAYMENT_SUPABASE_URL | approved isolated TEST Supabase URL with canonical APP migration installed |
| PAYMENT_SUPABASE_PUBLISHABLE_KEY | project public API key, server binding |
| PAYMENT_FINANCE_TOKEN | secret, Owner-provisioned narrow essay_finance bearer with approved server subject |
| PAYMENT_SUPPORT_SUBJECTS | secret/config, comma-separated dedicated test support Auth subjects; never published |
| TOSS_TEST_CLIENT_KEY | TEST standard-payment client key; test_ck prefix |
| TOSS_TEST_SECRET_KEY | secret, TEST standard-payment secret; test_sk prefix |
| TOSS_MID | merchant identifier matching TEST API response, expected Owner MID leglabn24k |

Normal browser Supabase auth configuration must point to the **same isolated TEST project**
for Preview. Follow `SHARED_ACCOUNT_AUTH_SETUP.md`; do not mix Production login tokens with
an isolated payment DB. No secret is NEXT_PUBLIC, a query parameter or a committed .env.
Do not use LIVE keys. Configuration fails closed if any required binding is missing.
Remote Cloudflare configuration is NOT_VERIFIED; no secret values were accessed.

Production migration is NOT authorized. If only shared Production Supabase is available,
stop external E2E for separate DB approval. Secret provisioning alone is insufficient.
No migration is duplicated into LAB. Real provider-only TEST can be separately verified,
but is not evidence of LegendStudy persistence integration.

## Validation and remaining gates

Node22 / locked pnpm dependencies. `cloudflare/payments.test.ts`: 45 deterministic adapter
checks; `payment-test.test.tsx`: 5 browser component checks. Full suite185 PASS including
pricing27, legal20, business20, release routes7 and existing auth/Kakao regressions.
TypeScript, ESLint, boundary audit, static export44 pages PASS. Evidence: [validation](PAYMENT_2_VALIDATION.json).
Concurrency tests use simultaneous adapter requests against a contract fake with posting-once
semantics; real PostgreSQL locking remains separately proven by APP, not re-claimed here.
No LIVE calls, DB connections or Production writes. Official documentation/Sandbox TEST provider proof is separate below; leglabn24k E2E remains NOT_RUN.

Owner sequence: review feature branch → select approved isolated DB artifact and install there
separately → provision narrow finance credential/TEST bindings → authorize Preview deployment
→ dedicated synthetic normal-auth account → checkout/callback/duplicate refresh/recovery
→ support-owned test cancellation → verify TEST record and no spendable Credit → review.
Do not merge main automatically. Production review exposure, Production DB apply and LIVE
are distinct future approvals. LIVE additionally requires actual data-flow Privacy, accounting,
refund exceptions, lifecycle/paid-unknown recovery, webhook/monitoring and merchant gates.

Abort: keep PAYMENT_MODE absent/disabled, do not deploy. Once external TEST operations exist,
stop new orders but preserve reconciliation runtime/APP records until resolved. Do not delete
financial history or roll APP schema back from LAB. Forward-fix pending operations.

## Official documentation/Sandbox TEST verification — 2026-10-03

Owner explicitly authorized the official `/reference/test` public documentation-key flow.
No merchant credential was needed for this **provider-only** proof. Public TEST keys were
read only from official Sandbox assets, used in a private temporary script and not committed.
Two fresh synthetic Sandbox purchases were authenticated through its demo quick-account flow
with its prefilled synthetic information. No real bank/card/customer details were entered.
This proves Sandbox SDK V2 widget/provider operations, **not** LAB standard CARD checkout.

[Sanitized API evidence](PAYMENT_2_PROVIDER_TEST.json):14 direct TEST REST calls plus one
Sandbox UI confirmation. Transaction1: lookup IN_PROGRESS; wrong amount403 FORBIDDEN_REQUEST;
confirm200 DONE; same-key confirm200 with no new transaction; lookup; partial cancel10000
of50000; identical retry keeps one cancellation/balance40000; lookup; remaining40000 cancel
and final lookup balance0 (provider retains PARTIAL_CANCELED after two partial operations).
Transaction2: Sandbox UI confirm; lookup DONE; unused full50000 cancel200 CANCELED;
identical retry keeps one cancellation/balance0; final lookup CANCELED. Both TEST purchases
fully reversed in the provider. Keys/payment identifiers/raw payloads omitted from artifacts.

TOSS_DOCUMENTATION_PROVIDER_TEST: PASS for approval/lookup/full+partial cancel/idempotency
and amount-mismatch refusal. TOSS_LEGLABN24K_TEST: NOT_RUN.
LEGENDSTUDY_PERSISTENCE_RUNTIME_E2E: NOT_RUN (deterministic binding tests PASS).
No APP RPC was called during provider proof; spendable Credit impact0. SDK authentication
background requests are not included in the14 direct REST count. Success callback fields
paymentType/orderId/paymentKey/amount observed; failure callback remains deterministic UI proof.
