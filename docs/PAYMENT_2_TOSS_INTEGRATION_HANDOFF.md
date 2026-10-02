# PAYMENT-2 — Toss Payments integration handoff

Status: **planned, not implemented.** PAYMENT-1B published the public pricing and
refund pages only. No payment provider is connected, no payment key exists in
this repository, and no financial write path is live.

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
13. **Test and live key separation** — test keys must be impossible to reach in
    the production environment.
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

## Still required before payment can be switched on

- Published 이용약관 (`/terms/`) and 개인정보처리방침 (`/privacy/`) — both are
  currently drafts marked `noindex`.
- Owner business data: 상호, 대표자, 사업자등록번호, 통신판매업 신고번호,
  사업장 주소, 고객센터 전화, 고객센터 이메일, 개인정보 보호책임자.
- A real support channel for `/support/` so refund intake is possible.
- Legal review of the statutory-rights wording and the minor-payment clause.
- Confirmation of when the essay service itself opens; the pricing page
  currently discloses that both essay tracks are 준비 중.