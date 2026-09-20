# LS LAB Phase 1 Release Web Foundation

## Purpose

This repository now separates a **public LegendStudy LAB entry foundation** from the earlier private Phase 2 demonstration routes. The intended stable paths are `/lab/`, `/lab/how-it-works/`, and `/lab/coverage/`. Cloudflare Pages applies the tracked `public/_redirects` rule from `/` to `/lab/` with HTTP 308, while the generated root page is a safe static fallback for hosts without redirect rules.

The project has no hosting account, domain, DNS record, Git remote, production environment, shared authentication, payment provider, or user-data backend configured. No preview or sandbox URL is a canonical URL.

## Public paths and publication state

| Path | Current purpose | Publication state |
|---|---|---|
| `/lab` | LS LAB service introduction and public entry | Service-preparing public copy; deployable only after a final host is approved |
| `/lab/how-it-works` | Clear explanation of the current service boundary | Service-preparing public copy |
| `/lab/coverage` | Current scope and explicit non-features | Foundation-only public copy |
| `/privacy` | Privacy-policy review and URL foundation | Draft; owner review required; not Store-ready |
| `/terms` | Terms review and URL foundation | Draft; owner review required; not Store-ready |
| `/support` | Support URL foundation | Owner action required; no live contact channel |
| `/account-deletion` | Account-deletion URL foundation | Foundation-only; no request or deletion workflow |

## Canonical-origin gate

`NEXT_PUBLIC_SITE_URL` is intentionally absent from the repository. A Product Owner must set it at build time to the approved HTTPS origin without a trailing slash. Until that value is configured, public release pages are `noindex`, `robots.txt` disallows crawling, `sitemap.xml` is empty, and no canonical URL is emitted.

After an approved host is configured, the site will generate canonicals and a sitemap for the three LS LAB public release pages. The policy routes remain `noindex` until their legal text, contact details, and publication decision are complete.

## Required Owner actions before public release

1. Choose and configure a hosting provider and the final HTTPS domain. There is no existing provider configuration to reuse.
2. Set `NEXT_PUBLIC_SITE_URL` in that provider's production environment to the final origin.
3. Approve final Korean copy for the public LS LAB pages and decide whether the existing `LS LAB by LegendStudy` naming remains the public name.
4. Replace the draft privacy and terms pages with reviewed, dated, published policy documents that match the actual LegendStudy+ and LS LAB data flows.
5. Configure a real support channel, handling owner, response expectations, and escalation process.
6. Implement and validate an authenticated account-deletion request or in-app deletion path before using `/account-deletion` in a store listing.
7. Confirm legal rights for any future official problem, answer, explanation, audio, OCR, caching, downloading, AI input, or redistribution behavior.

## Deployment sequence after approval

Run `pnpm verify`, build with the approved production `NEXT_PUBLIC_SITE_URL`, deploy through the Owner-selected provider, and validate the final HTTPS origin. The release checklist must include `/`, `/lab`, `/lab/how-it-works`, `/lab/coverage`, `/privacy`, `/terms`, `/support`, `/account-deletion`, `/robots.txt`, `/sitemap.xml`, and a missing route. Verify mobile widths 360, 390, and 430 pixels, tablet, and desktop before publishing the URL in mobile-app metadata.

## Explicit non-features

This foundation does not implement WebView integration, shared authentication, app session transfer, payment token transfer, deep account linking, automatic result synchronization, academic-record synchronization, AI evaluation, payment, subscription, credit, content mirroring, data persistence, support intake, or account deletion.
