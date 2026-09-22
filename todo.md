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

## Current operations and next work

### 2026-09-22 — Kakao OIDC replacement (local implementation, not deployed)

- [x] Removed LAB Kakao hosted OAuth/additive scope workaround after Owner's confirmed KOE205 report. Email/Google/Apple flows are preserved; App repository unchanged. Owner now reports App Kakao PASS.
- [x] Added Pages-only server exchange, minimal openid/account_email scope, state cookie + tab binding, SHA-256 nonce, S256 PKCE, no-store ID-token JSON handoff and existing Supabase browser sign-in/session model.
- [x] Node 22 validation: 52 tests PASS, typecheck/lint/boundary audit PASS; Next static build PASS with `pnpm build --webpack`. Default Turbopack failed on local process/port permission (`Operation not permitted`), not TypeScript/product code. Wrangler 4.136.1 compiled the real Pages Functions locally. GitHub-ready/credential scan, browser bundle secret-boundary scan and diff check PASS. No external auth request or deployment.
- [ ] Owner confirms Pages Git/Functions deployment mode and current Kakao Client Secret ON/OFF; configure only the runtime bindings and callback specified in `docs/SHARED_ACCOUNT_AUTH_SETUP.md`. Push/deploy requires Owner approval. Local compile is not Production runtime verification.
- [ ] LAB Kakao replacement Production login/logout/relogin/session/isolation and App↔LAB same-user identity E2E remain NOT VERIFIED. Do not expand profile consent or erase historical PASS evidence.


- [x] LAB web Production Auth E2E: email signup/confirmation/login/logout, password recovery/reset/sign-out, and Google/Kakao/Apple OAuth verified by Owner on 2026-09-21. See `docs/SHARED_ACCOUNT_AUTH_SETUP.md`.
- [ ] Rotate the Google OAuth client secret. The prior setup process exposed it in a screen capture; do not record credential values in this repository.
- [ ] Renew the Apple OAuth client secret before expiry (maximum six-month lifetime); replace it in Supabase and record only the renewal date, never the secret.
- [ ] Implement and verify Apple authorization/token revoke in the account-deletion flow before Store release; keep the Store Release Gate closed until complete.
- [ ] **After Kakao OIDC deployment acceptance:** verify LegendStudy+ App ↔ LAB shared-account identity in Production. Test email, Google, Kakao, Apple, A→logout→B owner isolation, app session restore after relaunch, same `auth.users.id` across App/LAB, and owner-scoped Materials bookmark/grade isolation. Shared account identity does not imply shared browser/native session. Owner has since reported App provider login PASS; same-Kakao-user App↔LAB identity remains unverified.
- [ ] Replace privacy and terms foundations with Owner-reviewed, dated policy documents that match actual data processing before any account or data feature launches.
- [ ] Connect a real support channel and an authenticated account-deletion workflow, including Apple authorization/token revoke, before using policy URLs in mobile-store metadata or closing the Store Release Gate.
- [ ] Complete rights and source reviews before presenting university problems, passages, answers, rubrics, or audio as in-product content.
- [ ] Conduct separate security, privacy, quality, cost, and operating reviews before enabling answer persistence, learning-record analytics, AI feedback, payment, subscription, credit, or any authenticated personal-data API.
- [ ] Reassess static hosting if future functionality requires server-managed sessions, payments, live AI processing, or server-side data processing.
