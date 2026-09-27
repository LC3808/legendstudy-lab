# LegendStudy LAB Production Landing and Route IA

## Purpose

The public production entry for **LegendStudy LAB** is now `https://lab.legendstudy.com/`. The landing page explains the service direction, its current public scope, and the learning flow it is preparing. It does not present AI feedback, payment, subscriptions, account synchronization, or university-source copying as live features.

The repository is deployed to Cloudflare Pages and the production custom domain is connected. `NEXT_PUBLIC_SITE_URL` is set to the canonical production origin at build time.

## Landing Phase 1 — Owner-approved visual foundation

The approved Landing Phase 1 direction is **Axis Convergence**. It expresses the future B2C admissions-data platform through three equal and independent data tracks: **내신** — 과목별 성취도 · 변화; **모의고사 · 수능** — 시험별 성적 · 강점과 약점; and **논술** — 작성 · 첨삭 · 재작성. The straight tracks are conceptual product-direction language only. They show no student score, date, year, prediction, or live data.

The Hero copy is fixed to two Korean lines:

```text
데이터가 쌓일수록,
나의 가능성은 선명해집니다.
```

The current implementation uses a maximum Desktop size of 56px, a 36px Mobile size, a 500 weight, and Korean readability-first line spacing. Curved convergence lines and the person/profile node were deliberately removed because they overlapped at real browser sizes. A small supporting statement, `하나의 기록으로 연결됩니다.`, may accompany the three tracks without becoming a CTA or a product claim.

The visual language uses warm white or light neutral surfaces, LegendStudy Navy, limited Orange points, and a deliberate line hierarchy. Major section dividers use strong Navy; data tracks use thin Navy; internal guides remain neutral. Lines express data accumulation and connection, rather than card borders. Avoid excessive cards, shadows, empty pure-white minimalism, stock images, generic AI imagery, and invented logo work. The existing official transparent LegendStudy logo asset remains the only logo used by the landing.

This is the default visual foundation for future LAB Web work. It preserves the existing Three Labs, Connected Data, Navy process band, truthful public-scope language, and real CTA destinations. It does not alter browser Auth, Kakao OIDC, Supabase, Pages Functions, data access, or route architecture.

## Route roles

| Path | Current purpose | Indexing and delivery state |
| --- | --- | --- |
| `/` | Canonical LegendStudy LAB introduction and value-led landing page | Public, indexable, canonical root |
| `/lab/` | Legacy compatibility alias | Cloudflare Pages redirects to `/` with HTTP 308; static fallback is noindex |
| `/lab/how-it-works/` | Explanation of the planned service flow and current boundary | Public, indexable |
| `/lab/coverage/` | Current scope and explicit non-features | Public, indexable |
| `/privacy/`, `/terms/` | Policy URL foundations | Draft, noindex, Owner review required |
| `/support/` | Support URL foundation | Noindex, no live contact channel |
| `/account-deletion/` | Account deletion URL foundation | Noindex, no request or deletion workflow; Apple revoke gate open |

## Canonical and crawler behavior

The production build uses `NEXT_PUBLIC_SITE_URL=https://lab.legendstudy.com`. The root landing page emits a canonical URL for `/`, and the public sitemap lists `/`, `/lab/how-it-works/`, and `/lab/coverage/`. The compatibility route `/lab/` is not listed in the sitemap and has a root canonical fallback.

The policy and future-development routes remain noindex. Private development foundations under `/essay-lab`, `/my`, `/score-analysis`, and `/login` remain excluded from public navigation and crawlers. LAB browser Auth is Production E2E verified; App social Auth, App↔LAB identity, and Apple account-deletion revoke remain open. See [Shared Account Auth Setup](SHARED_ACCOUNT_AUTH_SETUP.md#production-auth-status-2026-09-21).

## Current public scope

The landing page presents the following as a **preparation direction**, not as live product capability: university essay information, past-question and trend analysis, answer writing, feedback, and learning records. The current public release provides only the service introduction, usage guidance, scope disclosure, and policy/support URL foundations.

## Release verification

Before every release, run `pnpm verify`, `pnpm audit:github-ready`, and `git diff --check`. Build with the production canonical origin, then validate the root route, public subroutes, crawler files, a missing route, desktop, mobile, and small-mobile layouts against the deployed HTTPS domain.

## Explicit non-features

This release has Production-verified LAB browser authentication. It does not implement payment, subscription, credit, user data persistence, AI evaluation, university-source mirroring, support intake, account deletion, WebView session transfer, App↔LAB identity verification, or app-record synchronization. Each must receive its own rights, security, privacy, product, and operating review before release. Apple authorization/token revoke remains an open Store Release Gate.
