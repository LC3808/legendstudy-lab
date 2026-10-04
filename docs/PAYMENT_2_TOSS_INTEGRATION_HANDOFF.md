# PAYMENT-2 — Toss Payments integration handoff

Status: **LAB Phase A implemented / deterministic verified; official documentation/Sandbox provider TEST verified; merchant E2E not run.**
No deployment, Production DB apply, LIVE call or financial write. Public pricing stays
PAYMENT_NOT_READY; a separate `/payments/test/` screen is ready for approved TEST configuration.

Canonical candidate reconciled in PAYMENT-E2E-PREP-1: APP
`3b3b869297a0884bfb908c87977fa14519f72d91`, `20261003000100_payment_foundation.sql`,
SHA-256 `77b460bf2bf437a8d6dd03d78454ece17c6c4143fe50d7f28b6ea30a51509c75`.
Old e4836eda / be808d96… is SUPERSEDED_PRE_APPLY. DTO is compatible; provider, if
present, must be TOSS. No Production apply selected or authorized.

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

## PAYMENT-E2E-PREP-1 — isolated Hosted TEST preparation

No project creation, config change, deployment or merchant call performed. APP bootstrap:
[24-file allowlist and Owner procedure](https://github.com/LC3808/legendstudy-app/tree/codex/essay-scaffolding-vnext/supabase/verification/payments/hosted-test).
No Production data/Auth/key copy. Math/provider005 excluded; ADR-2/day_targets only installed
as explicit dependencies in the **new empty TEST** project, never replayed into Production.

Browser auth now checks a build-declared exact Preview-origin/TEST-project pair. Production
`https://lab.legendstudy.com` remains bound to its canonical Production project. Unknown
origin, missing Preview declaration, foreign URL, or Production project on Preview fails closed.
No query/localStorage mode selector. The two extra NEXT_PUBLIC_AUTH_PREVIEW_* values are
Owner build configuration, not a browser request. Never take them from customer input.
Only HTTPS *.pages.dev Preview origins are accepted in this phase; custom-domain test setup
would require a reviewed mapping change. SSR/unknown origin yields no Auth client.

Payment outbound fetch uses manual redirects; **all3xx rejected** for both Supabase and Toss.
Real workerd8 scenarios200/400/301/302/303/304/307/308 passed, one outbound request each,
zero redirect follows. No real upstream request; synthetic outbound service.
`node scripts/test-payment-workerd.mjs /path/to/miniflare` reproduces it.

### Exact configuration (not configured here)

Cloudflare → Workers & Pages → approved TEST Pages project → Settings → Variables and
Secrets → **Preview**. Build-time NEXT_PUBLIC values require a fresh static build. Runtime
secrets belong only to Functions. [Cloudflare binding documentation](https://developers.cloudflare.com/pages/functions/bindings/).
For this E2E all rows below are Preview-only; existing Production Auth values stay unchanged.
Do not put finance secrets into Preview environments accessible by unreviewed branches.
Prefer a dedicated TEST Pages project if deployment controls cannot isolate trusted code.

| Variable | Classification | Consumer/time | Expected format / validation |
|---|---|---|---|
| PAYMENT_MODE | PUBLIC config | Functions runtime | exactly TEST; missing/LIVE fail closed |
| PAYMENT_ORIGIN | PUBLIC config | Functions runtime | exact approved HTTPS Preview origin, no path/trailing slash; Origin/request URL must match |
| PAYMENT_SUPABASE_URL | PUBLIC | Functions runtime | new approved TEST https://projectref.supabase.co; equal browser URL, never Production |
| PAYMENT_SUPABASE_PUBLISHABLE_KEY | PUBLIC key | Functions runtime | same TEST project publishable key; server forwards as apikey, gateway validates |
| PAYMENT_FINANCE_TOKEN | SECRET | Functions runtime only | short-lived signed TEST JWT role essay_finance, non-null gateway sub; signature/expiry/role validated by Data API |
| PAYMENT_SUPPORT_SUBJECTS | SECRET/private config | Functions runtime only | comma-separated synthetic buyer/support Auth UUIDs; exact verified sub membership plus own order |
| TOSS_TEST_CLIENT_KEY | PUBLIC key | Functions runtime → checkout browser response | merchant standard SDK test_ck_ prefix; merchant match verified at provider boundary |
| TOSS_TEST_SECRET_KEY | SECRET | Functions runtime only | matching merchant test_sk_ prefix; never NEXT_PUBLIC or bundle |
| TOSS_MID | PUBLIC identifier | Functions runtime | leglabn24k; verified TEST provider identity is exactly tleglabn24k (see 2026-10-04 runtime evidence) |
| NEXT_PUBLIC_SUPABASE_URL | PUBLIC | browser build-time | equal PAYMENT_SUPABASE_URL and approved Preview project declaration |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | PUBLIC key | browser build-time | same TEST project, sb_publishable_ format |
| NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS | PUBLIC | browser build-time | empty for initial email/password-only E2E |
| NEXT_PUBLIC_AUTH_PREVIEW_ORIGIN | PUBLIC | browser build-time | exact approved HTTPS *.pages.dev origin; equal PAYMENT_ORIGIN |
| NEXT_PUBLIC_AUTH_PREVIEW_SUPABASE_URL | PUBLIC | browser build-time | exact approved non-Production TEST project URL; no trailing slash |

Client checks cannot certify a deployment administrator's choice of project. Owner must
cross-check the identical TEST project across build/runtime bindings; no arbitrary client
field changes those bindings. Runtime gateway validates key/JWT issuer independently.
Secret presence in Cloudflare remains NOT_VERIFIED; no values requested or read here.

Owner sequence: approve empty Hosted TEST creation → hash-checked APP bootstrap/postflight →
synthetic email/password Auth and own-profile insertion via canonical RLS → finance gateway
membership/signing + actual JWT denial/success matrix → trusted Preview config/build/deploy
approval → separately authorized merchant TEST E2E. Finance token also has existing admin
Credit/refund RPC capability, so it must never target Production or reach browser.
Managed signing keys are not extractable; Owner follows APP package's test-only imported-key
procedure, stores only short-lived bearer in Cloudflare, keeps signing private key offline.

Current evidence: full LAB186 tests, typecheck, lint, boundary and GitHub-readiness PASS;
workerd8 PASS. Production/Hosted JWT cryptographic gateway and merchant E2E remain separate.
TOSS_CHECKOUT_REVIEW_READY remains NO; PAYMENT_LIVE_READY remains NO.


## 2026-10-04 — PAYMENT-E2E-TOSS-1R-FAST runtime evidence

This dated section supersedes earlier NOT_RUN statements for the dedicated merchant TEST flow.
Dedicated project: `legendstudy-lab-payment-test`, origin
`https://legendstudy-lab-payment-test.pages.dev`, isolated Supabase `wsnrwklplnunjktyfmbr`.
These bindings are in the dedicated project's Production environment (its default TEST origin),
not the real LAB Production project. Payment feature remains unmerged.

Root cause: authenticated Toss lookup returned `mId=tleglabn24k`; the handler compared it
with configured merchant `leglabn24k`, raised PROVIDER_MISMATCH before sending confirm.
Payment identity, order identity, KRW and4900 all matched. Official developer dashboard,
company merchant1835291 / selected MIDleglabn24k, showed the identical original order.
This runtime and dashboard evidence establishes this exact merchant's TEST mapping; do not
infer arbitrary prefix mappings for other merchants. Code5b132b2 maps only this configured
merchant to its exact TEST response identity; live mode and other MID mismatches remain denied.
Diagnostics expose only bounded error identifiers, stages and mismatch facts, no raw provider
payload/card/auth/secret. Original order retained: dashboard EXPIRED, local pending UNKNOWN;
no payment/grant assertion or destructive cleanup for it.

One authorized replacement1c4900 TEST checkout was completed by Owner. Server verified Toss
response and posted PAID/TEST_RECORDED through canonical APP RPC. Paid_at2026-10-04T04:45:03Z,
credit_expires_at2027-01-04T04:45:03Z, no canonical spendable grant. Duplicate confirm200,
conflicting payment identity409, amount mismatch422. Full cancellation200, duplicate cancel200,
final reconciliation200/CANCELLED/REVOKED. Successful cancel path verifies provider canceled
status, one DONE cancellation4900 and balanceAmount0 before local finalization. Independent
Toss dashboard shows the same replacement order cancelled; LAB result refresh shows CANCELLED.
SQL confirms exactly one successful CONFIRM and one successful CANCEL operation for replacement.
Foreign-owner runtime PASS: existing synthetic gateway logged in through normal Supabase Auth;
status/confirm/cancel against the buyer-owned order each returned404 ORDER_REQUEST_REJECTED,
no order data disclosed. No new signup or fabricated user token.
PAYMENT_E2E_TOSS_TEST: COMPLETE. READY_FOR_PAYMENT_NEXT_GATE: YES (Owner review only).

Final ledger query: payment-attributable spendable delta0, purchase grants0, order-grant links0,
payment-linked postings0, LIVE orders/grants0, unexplained/unclassified delta/postings0.
Existing signup bonus6 remains separate. Production accesses/writes0, LIVE calls0.
Validation:191 deterministic tests PASS, typecheck/lint/boundary PASS; Cloudflare static build
and deploy5b132b2 PASS (bd062d3b-9d2d-4a91-b875-28971c0609cb). Static scan7HTML/12JS PASS,
finance JWT/Toss secret absent. Local Turbopack build cannot bind a port in this execution
sandbox; deployed Cloudflare build passed. Additional workerd rerun unavailable because the
installed binary supports compatibility dates only through2026-05-03; earlier PREP8-case PASS
is historical and is not relabeled as a new run.

This phase does not authorize LIVE, public Production review exposure or main merge.

## PAYMENT-PRODUCTION-READINESS-1 — 2026-10-04 (PREPARE ONLY)

**TEST_E2E: COMPLETE. PRODUCTION_READINESS: BLOCKED. PRODUCTION_APPLIED: NO. LIVE_ENABLED: NO.**
Owner accepted the completed merchant TEST chain at5b132b2/final8422ed7. This task does not reopen it or run another payment. Readiness branch `codex/payment-production-readiness` is not deployed or merged. APP exact migration package: `supabase/verification/payments/production/README.md` on the same named APP readiness branch; two-file manifest ADR prerequisite then Payment, never Hosted TEST24 replay.

### Verified source / new evidence

- Canonical APP payment revision3b3b869297a0884bfb908c87977fa14519f72d91; Hosted verification43752ce5fa23d44be29edb7cdf6319bc15e0a1ab; later TEST24h mint revisiona5afe71. `20261003000100_payment_foundation.sql` SHA25677b460bf2bf437a8d6dd03d78454ece17c6c4143fe50d7f28b6ea30a51509c75 unchanged.
- LAB source5b132b22ff263c0e829b9d8bd1847bfeb37981ab/final8422ed7; source SHA794c7a7c62a24c2e29c76a07d55e52a4acaf61d9e5feb17e96bf6a6bfb39389a before this task. Main87ce790 includes subsequent disabled pricing CTA work; future authorized integration must preserve it, not overwrite/merge here.
- New server hardening pins the dedicated TEST origin to its exact isolated Supabase project before forwarding any buyer/finance credential. Previously only URL syntax was validated. Valid-but-wrong project/origin now fails503 with zero outbound requests. No change to completed merchant mapping or financial RPCs. This branch is not deployed; existing TEST deployment remains accepted historical evidence.
- [Fresh validation receipt](PAYMENT_PRODUCTION_READINESS_VALIDATION.json):199 tests PASS, typecheck/lint/boundary PASS; static export `next build --webpack` PASS (bundled Next guide supports this alternative; default Turbopack not re-certified). workerd1.20261001.1/date2026-09-22:8 synthetic redirect-boundary cases PASS, no provider/DB calls.249 output assets/55JS scanned; no JWT/Toss secret/private key patterns. This scans a fresh credential-free build, not future Production secrets. Repeat scan after actual separately authorized config/deploy.
- Explicit read-only Production audit in APP package: PostgreSQL17.6,23 tracked versions; canonical ledger/Auth/profiles present, purchase grants0, ADR and Payment absent.9 ADR predecessor security contracts PASS, storage policy authority TRUE. Production preflight requires Owner action; no actual apply performed.
- APP isolated Payment81, Credit84+static7, HQP102, Math131+37+63 PASS. Four LIVE-equivalent SKU grant quantities/exactly-once, leap/month-end UTC expiry,8,100/5,400 refunds, concurrent consumption vs cancellation, provider/local failure and rollback verified. No LIVE provider call.

### Readiness classification

| Class | Required work / evidence |
|---|---|
| BLOCKER | ADR prerequisite absent in Production; separately approve exact ADR then Payment package, with fresh pre/postflight. Installation is not activation. |
| BLOCKER | Current `cloudflare/payments.ts` intentionally only supports TEST and TEST_RECORDED. LIVE mode returns503; `TOSS_LIVE_*` is not implemented. Need reviewed LIVE adapter with POSTED/grant binding, exact Production origin/project, independently verified LIVE MID, canonical amount/identity checks, and no TEST fallback. |
| BLOCKER | APP/LAB same ledger contract exists, but purchased balance display/runtime parity not delivered. Native Essay uses canonical evaluation RPC; current LAB payment has no spendable balance consumer. Add bounded own balance/history consumer and verify same account in both; no second wallet. |
| REQUIRED_BEFORE_LIVE | Separate server new-order/confirm shutdown controls, bounded recovery path and Owner-only smoke authorization, user-visible runtime mode/CTA contract. |
| REQUIRED_BEFORE_LIVE | Support cancellation currently requires support subject to own the order. Add bounded audited operator tool to handle other buyers, deleted/restricted owners, provider-paid/local-ungranted compensation and legal exception reasons. |
| REQUIRED_BEFORE_LIVE | Production finance renewal/revocation procedure tested in hosted gateway; retention/account-deletion treatment, pending-outcome monitoring and pricing/privacy/support activation copy reviewed. |
| POST_LAUNCH | Larger observability/support dashboard; bounded case inspection and recovery must already exist at launch. |
| OPTIONAL | Expanded operational report automation. |
| EXTERNAL_GATE | Toss/card approval WAITING; no completion evidence provided. Actual LIVE key pair↔MID verification required; TEST tleglabn24k is never assumed to equal LIVE MID. Store entitlement/commercial compliance is separate. |

### Configuration contract — do not configure now

Future location: Cloudflare → existing Production LAB Pages project → Settings → Variables and secrets → Production scope. Never put Production values in the dedicated TEST project. Set only after separately approved LIVE implementation; these declarations alone cannot activate current code.

| Name | Classification | Contract |
|---|---|---|
| PAYMENT_MODE | Text | Current code TEST only. Future LIVE value requires reviewed adapter and matching DB mode. Missing/unknown fail closed. |
| PAYMENT_ORIGIN | Text | Future exact https://lab.legendstudy.com; no client override or wildcard. |
| PAYMENT_SUPABASE_URL | Text | Future exact https://stlhijzpjfgwwdgunlsd.supabase.co; must match authenticated project. Current TEST adapter rejects it. |
| PAYMENT_SUPABASE_PUBLISHABLE_KEY | Text/public | Corresponding Production publishable key; never service_role. |
| PAYMENT_FINANCE_TOKEN | Secret/server | Separate Production role JWT. No NEXT_PUBLIC prefix, repository file or browser response. |
| PAYMENT_SUPPORT_SUBJECTS | Server configuration | Bounded reviewed support subject allowlist; current TEST owner-only restriction remains. No email/password. |
| TOSS_LIVE_CLIENT_KEY | Proposed public client binding | **Not implemented yet**; future LIVE adapter only. Independently matched key pair/merchant. |
| TOSS_LIVE_SECRET_KEY | Proposed Secret/server binding | **Not implemented yet**; never read by browser/bundle or substituted with TEST secret. |
| TOSS_MID | Text/server | Independently verified actual LIVE merchant identity. No automatic t-prefix or TEST mapping in LIVE. |

Keep existing `TOSS_TEST_CLIENT_KEY`/`TOSS_TEST_SECRET_KEY` only in isolated TEST. Browser may receive public Supabase/client key plus bounded order data; finance/Toss secret must stay Functions-only. Signing private key never goes to Cloudflare. Runtime response/bundle/log/source-map scans must all pass before opening purchases. Cloudflare secret/config changes require a new deployment; verify deployed commit and bindings independently. [Official Cloudflare bindings](https://developers.cloudflare.com/pages/functions/bindings/#secrets).

### Production finance credential plan (prepared, not provisioned)

1. Review current Production Auth/JWT consumers and key lifecycle read-only, including Edge Verify JWT compatibility. Do not copy TEST signing material, token, kid or synthetic identity. Choose a Production-only non-student technical subject UUID and record only its operational identity in protected configuration.
2. Owner-controlled signer creates/imports separate approved P-256/ES256 material and verifies trust using official lifecycle. Preserve current Auth key; do not rotate/revoke it blindly. A Production signing change may affect all Auth consumers and requires its own authorization/test.
3. Review narrow `authenticator → essay_finance` membership: SET=true, INHERIT=false, ADMIN=false; no anon/authenticated/service_role membership. Payment RPC only, no private helpers/table CRUD. Re-run actual hosted A–G matrix before purchases.
4. Claims: role essay_finance, Production technical sub, iss https://stlhijzpjfgwwdgunlsd.supabase.co/auth/v1, aud authenticated, iat/exp, approved alg/kid. Current offline mint tool is deliberately TEST-pinned; a reviewed Production signer profile/renewal implementation is required, not removal of its safety guard.
5. Proposed Production operational TTL60min, renew before30min remaining, alert at15min remaining; operational owner must accept and automate this before launch. TEST24h exception is not Production approval. Owner-controlled secure signer retains private material; output token mode0600, never terminal/chat/Git/log. Publish token only to encrypted server binding, verify deployment uses fresh token, retain prior valid token only for bounded overlap. No private material in Pages.
6. Expired token: stop new checkout before provider authorization, preserve pending operation, renew through controlled signer, redeploy and reconcile by existing order/provider idempotency identity. No service_role fallback. A key-signed JWT is not revoked by ordinary user logout; maintain tested capability revocation (remove narrow finance delegation/EXECUTE under separate incident authorization) and key revocation procedure. Global key revocation can affect other Auth sessions; do not use it casually as a payment-only switch.
7. Verify old token denied and replacement allowed, wrong-role/expired/invalid signature denied; no key values in evidence. Supabase key/JWKS caches and rotation lifecycle require verification, not assuming new standby keys work immediately. [Official signing lifecycle](https://supabase.com/docs/guides/auth/signing-keys), [JWT guidance](https://supabase.com/docs/guides/auth/jwts).

### Reconciliation / support runbook

Use authenticated server-side `GET /v1/payments/{paymentKey}`; compare canonical mode, provider merchant, paymentKey, orderId, KRW and amount before any posting. Never log raw response/card/receipt/PII. Provider idempotency is documented for15days; durable local uniqueness has no such expiration. After uncertain/old operation, look up first; never create a new key merely to force another money operation. [Official Toss authorization/idempotency](https://docs.tosspayments.com/reference/using-api/authorization).

| Case | Current durable state | Recovery / operator action |
|---|---|---|
| A confirm succeeded, local finalize failed | CONFIRM PENDING, AUTHORIZATION_PENDING/UNKNOWN | Same-order reconcile looks up DONE and calls confirm_finish; atomic ledger grant posts once. Deleted/restricted owner blocks and needs approved compensation route; no manual grant. |
| B claim succeeded, provider rejected | PENDING until outcome proven | Look up same payment. Only verified definitive rejection may call outcome REJECTED; never infer from HTTP timeout/error. Current LAB catches all unknowns, so terminal rejection automation is a pre-LIVE gap. |
| C cancel succeeded, local finalize failed | CANCEL_PENDING, unused grant fenced | Lookup cancellation amount/status/balance, then same operation cancel_finish. Do not release fence or delete unused Credits first. |
| D unknown timeout | PENDING/UNKNOWN | Bounded lookup/retry with original identities; operator queue if not resolved. Never tell customer paid/refunded from redirect alone. |
| E duplicate callback | SUCCEEDED or pending same operation | Return existing canonical result/reconcile; changed request identity conflicts; no second posting. |
| F finance token expired | RPC denied, provider outcome may remain unknown | Suspend new purchases, renew credential, verify gateway, reconcile existing operations before reopening. Credential failure is not payment rejection. |

Current buyer `/status` returns own bounded payment/grant state. `/reconcile` can recover with owner JWT; `/cancel` requires support+owner. It is insufficient as the sole Production operations path after logout/erasure. Minimum operator tool must read scoped order/mode/state/grant linkage, net consumed/reserved units, actual paid/refund/cancel amount, pending age and mismatch category. Use purchase lineage, not total wallet. No broad admin console is required. Unknown/reconciliation queue and grant consistency queries exist conceptually in APP catalog; do not give browser table CRUD. Before LIVE implement bounded access and exercise all six cases without using student data.

### CTA, kill switch and activation sequence

The following is a **blocked-until-implementation runbook**, not a claim these controls exist today. Current public Pricing CTA remains disabled and Payment TEST page clearly states no real charge/usable grant. No native Toss purchase CTA added. No IAP/Play work performed.

Required future runtime state: NOT_READY → hidden/disabled; TEST → only explicitly authorized isolated test path, Production purchase disabled; LIVE → enabled only when server availability, matching DB/config, finance health and Owner rollout gate all agree. Browser static flag/localStorage/return URL cannot authorize payment. Canonical server SKU/price/order ID remain authoritative. Define separate purchase-admission, confirm and recovery capability controls before implementing activation; no invented env name is treated as already supported.

After internal blockers are resolved, Toss/card approval is verified and Owner separately authorizes execution:

1. Freeze reviewed APP/LAB commits/hashes and rollback artifacts; fresh Production identity/catalog/preflight. Reconcile newer main pricing without losing approved copy, through normal separately authorized review/merge.
2. Owner applies only approved two-file candidate order, ADR then Payment with individual postflight; stop first failure. Defaults ADR OFF/payment TEST, no synthetic Production order. Separate approved tracking procedure, no repair/broad push.
3. Provision narrow Production finance capability and vetted signer/renewal. Hosted gateway matrix/deny tests PASS without provider calls; enroll only approved technical subject.
4. Verify LIVE key↔merchant identity in official Dashboard, set server bindings under separate authority. Deploy reviewed LIVE-capable code with public CTA and purchase admission OFF; keep isolated TEST project separate. Confirm latest build/commit and secret scan.
5. With entry still closed, perform separately approved DB mode/Owner smoke gating transition. Current migration contains no public activation API; exact private mode operation and guarded server control must be reviewed with final implementation. Missing runtime agreement must return unavailable, never TEST fallback.
6. Owner-only1c4,900 KRW real smoke transaction: server order/auth/amount → actual provider confirmation → one purchase grant → spendable +1 for same account in LAB and native APP → canonical expiry+3months. Refresh/retry leaves one grant. Inspect totals/lineage without student data.
7. If unused, separately authorized actual full cancel verifies provider amount/balance, local final state and purchase entitlement reversal; preserve unrelated grants. If consumed, use approved general refund/legal path, not force full refund.
8. Only after smoke/economic invariants PASS enable public CTA/admission; update existing '결제 준비 중/미활성' copy consistently in pricing, coverage/how-it-works, terms/privacy/support. Monitor pending age/credential expiry/grant mismatches/cancel fences immediately and after next credential renewal. Final Owner go-live review.

Kill procedure to implement/test before step4: immediately disable public CTA AND server order admission; disable new provider confirms separately, snapshot already authorized/pending transactions; keep read/recovery capability for existing payments. Hard credential compromise additionally disables finance capability with reviewed role/ACL revocation, then replaces/revokes credentials safely. Removing token today blocks all operations including recovery; it is only emergency containment, not a sufficient operational LIVE switch. In-flight provider success must be reconciled by a controlled recovery operator after access restored. Never set LIVE history to TEST, delete orders, erase grants or lose provider identities. Roll back application admission/config safely, forward-repair financial history.

### Policy / Store boundary and release evidence

Source comparison with main preserves1/3/5/10 pricing4900/11900/17900/29900;20 excluded; one initial answer plus included same-lineage reevaluation within14days; paid3calendar months, signup3 without expiry; refund actual minus4900 per used Credit, zero floor/free exclusion/legal rights preserved. Business/legal modules use 주식회사 코파카바나 and customer support support@legendstudy.com/contact@legendstudy.com. Pricing/refund/terms/privacy/support source checks and regressions PASS. Public URL recertification attempted read-only but HTTP403/tool-unavailable; no new public runtime PASS asserted. Pre-LIVE privacy/financial-retention language and inactive-service copy still require final review.

Native web-purchased entitlement is the same canonical ledger only; Store compliance remains separately reviewed. No external native checkout CTA or Apple/Google API added. External merchant approval is independent from these code/operations blockers.

Final: preparation artifacts/retests complete; **PAYMENT_PRODUCTION_READINESS BLOCKED**, **READY_FOR_PRODUCTION_ACTIVATION NO**. Migration SQL unchanged; no Production configuration/deploy/migration/financial writes, no TEST/LIVE provider calls, no main merge. Next Owner/ChatGPT reviews internal blockers → completes implementation/reviews → Toss/card approval → separately authorized Production activation. No secrets in this document.
