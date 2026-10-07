# Frontend reconciliation — 2026-10-07

Owner scope: public product shell only. Base: LAB main
`30613ee553648a19081f0919fcd276544097743f`. No branch-wide merge/cherry-pick.
Unified Wiki read at `63a76b2d9cf19902d9930727d0e6d82663383ae8`:
AI_CONTEXT, CURRENT_STATUS, architecture/source map and 2026-10-07 Daily.

## Existing work reconciliation

| Remote branch | Tip | Relationship to main / decision |
| --- | --- | --- |
| manus/home-simplification-1 | 9691ef3 | Fully included; main has 10 later commits. Reuse current landing. |
| manus/lab-ui-reconciliation-1 | 09db4c2 | Fully included; main has 14 later commits. Preserve current Pricing/Checkout. |
| manus/admin-console-p0-a | bbc23cb | 5 branch-only / 35 main-only commits. Admin, notifications and QL remain on their branch; do not import its older shell/runtime. |
| claude/quality-console-v0 | 253867b | 4 branch-only / 51 main-only commits. Quality/Human Review assets preserved on branch; out of scope. |
| claude/privacy-reconciliation-patch | 8c951cb | 1 branch-only / 35 main-only commits by ancestry, but both changed legal files are identical to main (patch landed as ed8a1ca). No reapplication. |

APP main is **not** current backend/product authority. Copy comes from APP final RC
`7d1c0368fd586ed625fb9cbe9bcacc46bfdcf6fc`, `lib/features/lab/lab_page.dart`:
내신 성적 기반 강점·보완 분석 / 모의고사·수능 성적 기반 영역별 분석 (관심 대학 기준).
Owner's current names override older APP labels. APP was read only.

## Resulting shell

- Same three LAB links plus 이용 안내 (`/pricing/`) for all auth states.
  Brand remains the only Home entry. No service-guide badge or fabricated entitlement.
- `/score-analysis/` = 내신 LAB; `/exam-analysis/` = 모의·수능 LAB;
  `/essay-lab/` = 논술 LAB. Public introductions; no new personal-data input or API.
- Header Credit consumes existing `useCreditSummary()`; no new balance state/RPC,
  no zero while loading/failed. Existing EssayCreditStatus and Credit reader preserved.
- Existing Home value/graphic retained once. Hero CTAs and repeated diagram removed;
  restrained heading weights, wider text, Korean word wrapping.
- Personal entry goes to `/login/?next=%2Faccount%2F`, or directly to MY when signed in.
  Auth-only return guard rejects auth/API destinations. Shared payment path guard unchanged.
- Login/signup copy shortened. Static/browser initial auth state agrees; provider and
  return-path UI resolves after hydration. Successful sign-in navigates once instead
  of racing `assign` against the authenticated-session redirect. Password input has
  an explicit accessible name. Auth backend policy and provider/API calls unchanged.
- Product examples explicitly remain examples; no claim of live evaluation, no new writes.
- Pricing order: 판매 상품 → 학교 단체 이용 / 이벤트 프로모션 → 구매 안내.
  Cards, selection, prices, coupon disabled behavior and payment runtime unchanged.
- Footer labels support and general/partnership email purposes; seller/policies preserved.
- Legacy `/lab/how-it-works/` → `/pricing/` and `/lab/coverage/` → `/` are host 308s,
  with useful static fallbacks; removed from sitemap. No payment callback redirect changes.

## Auth read-only findings and gap

**Production settings/DB are NOT independently verified in this task.** The cloud
proxy returned CONNECT 403 for lab.legendstudy.com; GitHub API was also Forbidden.
No Supabase/Cloudflare/DB credential bindings are provided to this environment.
Network additions were saved as an environment draft, not applied to the running machine.
No signup/login/bonus transaction was attempted on Production, and no policy was changed.

- Email confirmation ON/OFF: **UNKNOWN**; neither repository defaults nor old acceptance
  proves current hosted settings.
- Immediate signup session / pre-confirm login: **UNKNOWN on Production**. LAB preserves
  SDK behavior: session returned → intended destination; null session → confirmation email
  notice. This is a client contract, not a hosted-policy claim.
- Source authority: APP final RC migration `20260929000300` adds +3 at eligible profile
  creation / authenticated recovery claim. `20261001000300` overrides that path: when
  lifecycle is enabled, profile insertion no longer grants directly; verified-email
  worker/benefit-claim recovery is used. Current deployed definitions/flag/worker behavior
  must be read before declaring exact timing; this task did not modify them.
- Idempotency exists in source: `credit_signup_once_per_account` partial unique index,
  grant external reference / transaction idempotency key, and lifecycle
  `benefit_claims`/`benefit_delivery` with locking. Production presence not reverified.
- Next Auth/Credit task must read hosted Email confirmation, deployed lifecycle function
  definitions/activation and benefit worker status before changing anything toward
  confirmed-email → exactly-once +3. Do not add a second wallet or signup path.

## Validation / release

- `pnpm verify`: lint, typecheck, 307 tests / 28 files, boundary audit, static build PASS.
- Focused auth/navigation/product-shell regression checks PASS. Router-owned query
  state preserves `next` during soft navigation; no duplicate post-login navigation.
- Chromium public pages: 12 routes × 1440/1280/390/360 × 100%/200% text = 96 PASS;
  HTTP200 locally, no horizontal overflow. Home/Login/Pricing screenshots reviewed.
- Intercepted auth fixture browser: 40 responsive cases PASS, including visible
  mobile MY, canonical Credit 7, Home CTA → login → account, logout clears Credit,
  login-self return guard. No live authentication was used.
- Exported-page audit: 42 HTML files / 26 internal destinations, no broken links or
  forbidden rendered development copy. Host redirects checked statically; Python
  static server does not execute Cloudflare redirects or Functions.
- GitHub-readiness and payment static-secret scan PASS. Fixture build discarded;
  final static build uses no fixture credentials/configuration.
- Production deploy/live measurements and hosted Auth read-only checks require
  external access. Local checks are not evidence of Production success; Wiki records
  the final publication and blocked verification status.
Payment/Toss/finance code, Functions, DB/migrations, Credit hook and account deletion
implementation are unchanged. No Admin/QL code imported. No transaction/provider smoke
was run against frozen Payment. Local auth browser checks use entirely intercepted
fixture responses, not a live account or credential.
