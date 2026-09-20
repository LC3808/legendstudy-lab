# LegendStudy LAB Production Landing and Route IA

## Purpose

The public production entry for **LegendStudy LAB** is now `https://lab.legendstudy.com/`. The landing page explains the service direction, its current public scope, and the learning flow it is preparing. It does not present AI feedback, payment, subscriptions, account synchronization, or university-source copying as live features.

The repository is deployed to Cloudflare Pages and the production custom domain is connected. `NEXT_PUBLIC_SITE_URL` is set to the canonical production origin at build time.

## Route roles

| Path | Current purpose | Indexing and delivery state |
| --- | --- | --- |
| `/` | Canonical LegendStudy LAB introduction and value-led landing page | Public, indexable, canonical root |
| `/lab/` | Legacy compatibility alias | Cloudflare Pages redirects to `/` with HTTP 308; static fallback is noindex |
| `/lab/how-it-works/` | Explanation of the planned service flow and current boundary | Public, indexable |
| `/lab/coverage/` | Current scope and explicit non-features | Public, indexable |
| `/privacy/`, `/terms/` | Policy URL foundations | Draft, noindex, Owner review required |
| `/support/` | Support URL foundation | Noindex, no live contact channel |
| `/account-deletion/` | Account deletion URL foundation | Noindex, no request or deletion workflow |

## Canonical and crawler behavior

The production build uses `NEXT_PUBLIC_SITE_URL=https://lab.legendstudy.com`. The root landing page emits a canonical URL for `/`, and the public sitemap lists `/`, `/lab/how-it-works/`, and `/lab/coverage/`. The compatibility route `/lab/` is not listed in the sitemap and has a root canonical fallback.

The policy and future-development routes remain noindex. Private development foundations under `/essay-lab`, `/my`, `/score-analysis`, and `/login` remain excluded from public navigation and crawlers.

## Current public scope

The landing page presents the following as a **preparation direction**, not as live product capability: university essay information, past-question and trend analysis, answer writing, feedback, and learning records. The current public release provides only the service introduction, usage guidance, scope disclosure, and policy/support URL foundations.

## Release verification

Before every release, run `pnpm verify`, `pnpm audit:github-ready`, and `git diff --check`. Build with the production canonical origin, then validate the root route, public subroutes, crawler files, a missing route, desktop, mobile, and small-mobile layouts against the deployed HTTPS domain.

## Explicit non-features

This release does not implement shared authentication, payment, subscription, credit, user data persistence, AI evaluation, university-source mirroring, support intake, account deletion, WebView session transfer, or app-record synchronization. Each must receive its own rights, security, privacy, product, and operating review before public release.
