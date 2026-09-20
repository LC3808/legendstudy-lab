# LegendStudy LAB — Feature and Issue Tracker

**Project:** `legendstudy-lab-web` — deployed static Next.js public landing at `https://lab.legendstudy.com`.
**Scope:** Public information architecture, static release, and a browser-side shared-account foundation. This tracker does not authorize Supabase schema/RLS changes, user-data persistence, source extraction, live AI evaluation, payment, or app data synchronization.

## Completed foundation

- [x] Established the separate Next.js App Router project and static-export delivery model.
- [x] Created public service information, current-scope, policy-foundation, and support-foundation routes.
- [x] Added canonical production metadata, `robots.txt`, sitemap generation, Cloudflare Pages static configuration, GitHub readiness checks, and public repository delivery.
- [x] Connected the production canonical origin `https://lab.legendstudy.com` through Cloudflare Pages.
- [x] Kept private catalog, synthetic writing, mock evaluation, personal-history, payment, and source-content foundations out of public navigation and crawler indexing.

## Completed shared-account foundation

- [x] Confirmed the LegendStudy app’s expected Supabase project URL and its `auth.users.id` / RLS identity contract without reading a credential or touching the project.
- [x] Added browser-only `@supabase/supabase-js` behind an exact project-URL guard; no service-role key, database call, migration, or RLS change was added.
- [x] Added fail-closed `/login/`, `/signup/`, `/forgot-password/`, `/reset-password/`, and `/account/` routes with email/password flows, safe error copy, sign-out, noindex metadata, and a configuration-missing state.
- [x] Kept social provider buttons hidden unless a declared provider is both configured in the Cloudflare environment and verified by the Owner.
- [x] Verified unit contracts, static export, auth-route generation, secret scans, and desktop/mobile/small-mobile interface states without submitting a live Auth request.

## Completed official brand-logo rollout

- [x] Replaced the temporary header glyph with the supplied official LegendStudy logo.
- [x] Used the same official asset for the Next.js app icon, Apple touch icon, and favicon.
- [x] Validated desktop, 390-pixel, and 320-pixel header rendering; generated icon metadata; and static asset responses.

## Completed platform IA and shared-account UX refinement

- [x] Positioned LAB as the Web Intelligence / Deep Work Platform, with Essay Lab, Academic Analytics, and Activity Portfolio clearly treated as modules rather than separate products.
- [x] Reworked the public service flow around information → analysis → writing → evaluation → personal review without claiming unfinished capabilities are available.
- [x] Added safe account return-path handling, password recovery/reset states, fail-closed anonymous UI, and conditional social-provider controls.
- [x] Replaced synthetic My Essay/My Pattern history claims with honest account-linked placeholders until user-owned records and evidence contracts exist.
- [x] Updated the canonical LegendStudy Wiki with the actual LAB implementation state, platform boundary, and production acceptance blockers.

## Known blocked work

- [ ] Owner: set the existing project’s public Supabase URL and publishable key in Cloudflare Pages, then configure the exact production Auth Site URL and redirect paths. Follow `docs/SHARED_ACCOUNT_AUTH_SETUP.md`.
- [ ] Owner: verify email confirmation, login, logout, recovery, expired-link behavior, and each intentionally enabled OAuth provider with a non-production test account before representing authentication as live.
- [ ] Replace privacy and terms foundations with Owner-reviewed, dated policy documents that match actual data processing before any account or data feature launches.
- [ ] Connect a real support channel and an authenticated account-deletion workflow before using policy URLs in mobile-store metadata.
- [ ] Complete rights and source reviews before presenting university problems, passages, answers, rubrics, or audio as in-product content.
- [ ] Conduct separate security, privacy, quality, cost, and operating reviews before enabling answer persistence, learning-record analytics, AI feedback, payment, subscription, credit, or any authenticated personal-data API.
- [ ] Reassess static hosting if future functionality requires server-managed sessions, payments, live AI processing, or server-side data processing.
