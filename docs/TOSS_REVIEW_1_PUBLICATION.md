# TOSS-REVIEW-1 — Public seller identity, policy and support publication

Status: **implemented on `feat/pricing-page`; not merged, not deployed.** Payment,
Supabase, Credit financial logic and the Toss integration are untouched.

This note is internal release information. None of it is rendered on a public
page, and `scripts/verify-boundaries.mjs` fails the build if that vocabulary
reaches a consumer-facing surface.

## Public routes

| Route | State |
| --- | --- |
| `/pricing/` | Published. Owner-reviewed UX; prices, validity, re-evaluation window and refund terms all read from `pricing.ts` |
| `/refund/` | Published. Owner-approved refund rules; adds only the statutory-rights sentence |
| `/terms/` | Published operating document, 20 articles (TOSS-REVIEW-1C) |
| `/privacy/` | Published operating document, 17 articles (TOSS-REVIEW-1C) |
| `/support/` | Published customer centre, Owner-reviewed structure |

All five are public, require no login, carry no draft banner and no placeholder,
and are `index, follow` with a `lab.legendstudy.com` canonical. All five are in
`sitemap.xml` and in the `robots.txt` allow list.

## What was published

The site carries the Owner-confirmed seller identity and real contact channels
on every public page, so a Toss reviewer can confirm who is selling, under which
registration numbers, and how to reach the operator without signing in.

Published values:

- 상호 주식회사 코파카바나 / 대표자 장우진
- 사업자등록번호 262-88-02453 / 통신판매업 신고번호 2025-서울노원-1263
- 사업장 주소 서울특별시 노원구 화랑로 621, 서울여자대학교 고명우기념관 305호
- 레전드스터디 랩 고객센터 — 고객지원·결제·환불 `support@legendstudy.com` (주 채널),
  일반·제휴 `contact@legendstudy.com` (보조 채널)
- 전화 문의 010-6469-7654 — 사업자 정보 블록에만 공개하며 primary 채널이 아님
- 개인정보 보호책임자 장우진, 공개 연락처 `support@legendstudy.com`

## Single source of truth

| Fact | Module |
| --- | --- |
| Prices, Credit validity, free Credit, re-evaluation window, refund formula | `src/lib/pricing.ts` |
| Business identity, customer centre, privacy officer, activation gates | `src/lib/business-info.ts` |
| Terms and privacy content, effective date | `src/lib/legal-documents.ts` |

No page retypes a price, a period, a phone number, an address or an effective
date. `scripts/verify-boundaries.mjs` rejects the canonical value literals
(`4,900`, `11,900`, `17,900`, `29,900`, `14일`, `3개월`) on the five public policy
pages, and the consistency tests in `src/lib/business-info.test.ts` and
`src/lib/legal-documents.test.ts` assert that each document matches the modules.

### Policy effective date

`policyEffectiveDateIso` in `src/lib/legal-documents.ts` is the one place the
시행일 is written. Both documents render it, so they cannot drift apart.

**OWNER CLOSEOUT ITEM:** the value is `null` on this branch, because the
Production publication date is not fixed yet and the branch work date must not
be published as the effective date. While it is `null` the documents state that
they take effect from the date they are published — accurate, and free of any
developer placeholder. Set `policyEffectiveDateIso` to the real `YYYY-MM-DD`
publication date immediately before the merge to `main`; both documents then
render `YYYY년 M월 D일` everywhere they state an effective date.

## Customer centre naming and channel priority

The platform is LegendStudy Lab and the paid product is sold inside the Lab, so
consumer-facing support carries exactly one name, **레전드스터디 랩 고객센터**,
and e-mail is the primary channel everywhere. `customerCenter` owns the display
name, the two e-mail channels and the telephone channel.

| Level | Value |
| --- | --- |
| Site brand | LegendStudy Lab |
| Sold product | LegendStudy 논술 LAB / 논술 LAB |
| Operator | 주식회사 코파카바나 |
| Separate service | legendstudy.com (admissions materials) |
| App bundle | 레전드스터디+ — never used as the name of the LAB |

The telephone number is never the first contact method, never a headline card or
primary call-to-action, and never accompanied by operating hours or phone-first
wording. It is published inside the 사업자 정보 block (page-level only; the
footer stays e-mail centric via `BusinessInfoList showServiceContact={false}`).
Tests assert that the four previous names do not reappear, that the telephone
channel is absent from the e-mail channel list, and that no surface promises
phone-first help.

The internal admin mailbox and the corporate representative mailbox are
operational addresses and are deliberately not published as customer support
channels; a test asserts that neither appears in a consumer-facing surface.
Their literal values are not written into this repository, so they cannot be
harvested from it.

## Owner decisions closed in TOSS-REVIEW-1C

| Item | Resolution |
| --- | --- |
| 개인정보 보호책임자 | **장우진**, 공개 연락처 `support@legendstudy.com`. The telephone number is not used as the privacy contact. Published in privacy 제15조. |
| 미성년자 결제·법정대리인 동의 | **Resolved.** Terms 제10조 carries the Owner-confirmed clause: consent may be required, a contract without it can be cancelled by the minor or the guardian under the applicable law, cancellation can be limited where the guardian permitted the disposition, and general cancellation follows the refund policy while statutory rules prevail. No absolute refund promise. |
| 고객센터 운영시간 | **Not published, and no longer an open item.** It is not a Toss blocker; `SUPPORT_HOURS` was removed from the pending list entirely. |
| 처리위탁·국외이전 세부 | **No longer an open-ended research blocker.** The privacy policy states the confirmed relations only and stops there. |

The 통신판매업 변경신고 question (whether selling through Cloudflare Pages needs
one) is being confirmed with 노원구청 and stays `PENDING_ADMIN_CONFIRMATION`. The
existing valid filing number remains published; the site does not speculate
about the outcome and does not publish the regional-office address.

## Privacy policy — what it states, and what it deliberately does not

Current processing relations, described as they actually run:

- Supabase — 회원 인증과 서비스 데이터 저장. **Primary Database는 대한민국 서울 리전
  (ap-northeast-2).** The policy never says the data is stored in the United
  States and never claims that all Supabase processing is domestic.
- Cloudflare — LAB 웹사이트 호스팅과 전송, Kakao 로그인 토큰 교환. Described as a
  hosting and delivery provider, not as a static image host.
- Google Workspace — 고객센터 이메일 수신·회신. Presented as an operating fact, not
  as an unconfirmed arrangement.
- Resend — 앱 문의 알림 메일 발송. Described as mail delivery, not as an AI or
  analytics provider; no retention period is invented for it.
- Google / Apple / Kakao — 소셜 로그인 인증. The policy states that the company
  does not collect or store the providers' passwords.
- NEIS / external content — 공공 정보 조회 and direct communication with an
  external source when a user opens a linked file. The policy states that answer
  sheets and grades are never sent to a public information system.

Deliberately **not** listed, because none is active in Production:

Toss Payments (application submitted, PAYMENT-2 planned, MID `leglabn24k`),
OpenAI, Anthropic, Gemini, external Vision/OCR, AdMob, GA4 for LAB/APP, push
providers, Sentry/Crashlytics. Tests assert that none of these names appears in
the published policy.

The policy also does not claim to collect 생년월일, 주민등록번호, 학생부, 공식
성적표, 보호자 정보 or 결제 카드번호, and does not promise a 만 14세 미만 guardian
consent workflow that is not implemented.

## Privacy activation gates

`privacyActivationGates` in `src/lib/business-info.ts` lists the features that
must trigger a policy review **before** activation. It is internal information
and is never rendered; a test asserts the published surfaces do not carry it.

1. Toss Payments Production 결제
2. Production AI 평가 provider
3. Math private image/PDF Storage
4. external Vision/OCR provider
5. AdMob
6. GA4 또는 기타 analytics
7. push notification provider
8. external crash/error collection provider

## Surfacing behaviour fixed along the way

- The support page read like an internal runbook. It now opens with the two
  contact channels directly under the heading, then 환불 규정, 문의 접수 처리
  절차, 기타 안내 and 사업자 정보. The removed headings (이메일 문의, 문의 유형,
  환불 문의, 접수와 처리 절차, 관련 안내, 보조 연락수단) are guarded by
  `scripts/verify-boundaries.mjs`, which fails if any of them returns.
- The terms and privacy pages no longer render a pending-value block, a
  `LEGAL_REVIEW_RECOMMENDED` notice or a "시행일은 확정 후" placeholder. The
  pending block, `ownerPendingLabel` and `pendingOwnerData` were removed from the
  code entirely; the only surviving Owner item is the effective date.
- `robots.ts` lists each public document as an explicit `allow` rule. The `/lab`
  disallow prefix previously also covered `/lab/how-it-works/` and
  `/lab/coverage/`, so two sitemap URLs were unreachable to crawlers.
- `sitemap.xml` carries 8 URLs (`release-routes.ts: indexablePublicPaths`).
  `/account-deletion/` stays out of both the sitemap and the allow list.
- The pricing page carried two identically labelled `<aside>` notices;
  `ReleaseNotice` takes a `label`, so `landmark-unique` no longer fires.
- Reflow at 360px and 320px with 200% text scaling: grid and flex children
  default to `min-width: auto`, so the promotion form, the header brand, the
  footer block and the long status token forced a horizontal scrollbar. Released
  the automatic minimum sizes and allowed word breaks; no layout change at
  normal text sizes.
- The pricing page retyped the re-evaluation window as `14일`; it now reads
  `pricingPolicy.reevaluationWindowDays`, and the boundary audit rejects the
  literal on every public policy page.

## Pre-existing findings, deliberately not changed

1. `.button--accent` (white on `#e76f2f`, ~3.1:1) fails WCAG AA contrast. It is
   a design-system class already used by the header sign-in button in
   Production; verified against `https://lab.legendstudy.com/pricing/` before
   this work. Fixing it is a design-system colour decision.
2. `/essay-lab/` overflows horizontally at 200% text scaling. It is a foundation
   screen outside this change set.
3. The `/pricing/` hero keeps its Owner-approved `서비스 준비 중` state label and
   the card CTAs stay disabled, because payment is not live. This is a factual
   service state, not a draft marker.

## Verification

`pnpm verify` (lint, typecheck, 135 tests, boundary audit, production build) and
`pnpm audit:github-ready` pass. The static export was checked for the loading
fallback, dev placeholders, preview hosts, canonical URLs, sitemap/robots
consistency and legacy support names; 1123 internal references resolve. Reflow
passes at 360px and 320px with 200% text scaling on all five routes. axe-core
reports only the pre-existing `.button--accent` contrast finding.
