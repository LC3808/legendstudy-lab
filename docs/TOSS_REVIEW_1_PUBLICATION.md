# TOSS-REVIEW-1 — Public seller identity, policy and support publication

Status: **implemented on `feat/pricing-page`; not deployed.** Payment, Supabase,
Credit logic and the Toss integration are untouched.

## What was published

The site now carries the Owner-confirmed seller identity and a real customer
contact channel on every public page, so a Toss reviewer can confirm who is
selling, under which registration numbers, and how to reach the operator
without signing in.

| Surface | Before | Now |
| --- | --- | --- |
| Footer (all pages) | Brand line only | Seller identity, registration numbers, address, phone and support e-mail, plus the policy navigation |
| `/support/` | "URL foundation", no contact channel | Customer centre with phone, two public mailboxes and the enquiry process |
| `/terms/` | Draft, `noindex` | Published terms serving the real product conditions |
| `/privacy/` | Draft, `noindex` | Published policy derived from the real auth and data flow |
| `/pricing/` | "확정 후 게시" placeholder tags | Real business data plus the published documents |
| `/refund/` | "연락처는 확정 후 게시" | Real contacts and a seller-identity section |

## Single source of truth

`src/lib/business-info.ts` holds every published business value, contact and
Owner-pending item. `src/lib/legal-documents.ts` holds the terms and privacy
content and reads its prices and periods from `src/lib/pricing.ts`. No page
retypes a phone number, an address or a Credit period, which is what the
consistency tests in `src/lib/business-info.test.ts` and
`src/lib/legal-documents.test.ts` enforce.

Published values:

- 상호 주식회사 코파카바나 / 대표자 장우진
- 사업자등록번호 262-88-02453 / 통신판매업 신고번호 2025-서울노원-1263
- 사업장 주소 서울특별시 노원구 화랑로 621, 서울여자대학교 고명우기념관 305호
- 레전드스터디 랩 고객센터 — 고객지원·결제·환불 `support@legendstudy.com` (주 채널),
  일반·제휴 `contact@legendstudy.com` (보조 채널)
- 전화 문의 010-6469-7654 — 공개는 유지하되 primary 채널이 아니며, Support 페이지의
  하단 보조 연락수단으로만 표시

## Customer centre naming and channel priority

The platform is LegendStudy Lab and the paid product is sold inside the Lab, so
consumer-facing support carries exactly one name, **레전드스터디 랩 고객센터**,
and e-mail is the primary channel everywhere. `customerCenter` in
`src/lib/business-info.ts` owns the display name, the two e-mail channels and
the telephone channel; no page retypes them.

Kept distinct on purpose:

| Level | Value |
| --- | --- |
| Site brand | LegendStudy Lab |
| Sold product | LegendStudy 논술 LAB / 논술 LAB |
| Operator | 주식회사 코파카바나 |
| Separate service | legendstudy.com (admissions materials) |

The telephone number is never the first contact method, never a headline card or
primary call-to-action, and never accompanied by operating hours or
phone-first wording. It stays discoverable on `/support/` as 보조 연락수단, so a
reviewer can still verify a telephone channel. Tests assert that the four
previous names do not reappear, that the telephone channel is absent from the
e-mail channel list, and that no surface promises phone-first help.

The internal admin mailbox and the corporate representative mailbox are
operational addresses and are deliberately not published as customer support
channels; a test asserts that neither appears in a consumer-facing surface.
Their literal values are not written into this repository, so they cannot be
harvested from it.

## Owner data still confirmed as pending

Nothing here was guessed. Each item is either omitted or shown as an explicitly
pending row on the document that needs it, and all of them are reported by
`pendingOwnerData`.

| Key | Item | Blocks |
| --- | --- | --- |
| `PRIVACY_OFFICER` | 개인정보 보호책임자 name and contact | Toss review |
| `POLICY_EFFECTIVE_DATE` | Terms and privacy effective date | Toss review |
| `MINOR_PAYMENT_CLAUSE` | Minor payment and guardian-consent wording | Toss review |
| `PROCESSOR_AND_TRANSFER_DETAIL` | Processor storage region / overseas-transfer detail | Toss review |
| `SUPPORT_HOURS` | Customer-centre operating hours | Go-live |

The 통신판매업 변경신고 question (whether selling through Cloudflare Pages
needs one) is being confirmed with 노원구청. The existing valid filing number
stays published; the site does not speculate about the outcome, and the
regional-office address is not published.

## Surfacing behaviour fixed along the way

- `robots.ts` now lists each public document as an explicit `allow` rule. The
  `/lab` disallow prefix previously also covered the public
  `/lab/how-it-works/` and `/lab/coverage/` pages, so two sitemap URLs were
  unreachable to crawlers. RFC 9309 resolves the conflict by longest match.
- `sitemap.xml` grew from 4 to 8 URLs (`release-routes.ts: indexablePublicPaths`).
  `/account-deletion/` stays out of both the sitemap and the allow list.
- The pricing page carried two identically labelled `<aside>` notices;
  `ReleaseNotice` now takes a `label`, so `landmark-unique` no longer fires.
- Reflow at 360px and 320px with 200% text scaling: grid and flex children
  default to `min-width: auto`, so the promotion form, the header brand, the
  footer block and the long `LEGAL_REVIEW_RECOMMENDED.` token all forced a
  horizontal scrollbar. Released the automatic minimum sizes and allowed word
  breaks; no layout changes at normal text sizes.

## Pre-existing findings, deliberately not changed

1. `.button--accent` (white on `#e76f2f`, ~3.1:1) fails WCAG AA contrast. It is
   a design-system class already used by the header sign-in button in
   Production; verified against `https://lab.legendstudy.com/pricing/` before
   this change. Fixing it is a design-system colour decision, not part of this
   task.
2. `/essay-lab/` overflows horizontally at 200% text scaling (168px at 360px,
   208px at 320px). It is a foundation screen outside this change set.

## Verification

`pnpm verify` (lint, typecheck, 122 tests, boundary audit, build) passes. The
static export was checked for the loading fallback, dev placeholders, preview
hosts and canonical URLs; 1123 internal references resolve. axe-core reports no
new violation on the five pages.
