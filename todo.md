# LS LAB Phase 2 — Feature and Issue Tracker

**Project:** `legendstudy-lab-web` local Next.js candidate
**Scope:** Production-oriented frontend foundation only. This tracker does not authorize Production Supabase, shared Auth, database/RLS, source extraction, live AI evaluation, payment, public deployment, or GitHub repository creation.

## Completed planning

- [x] Confirmed the separate local project identity: `/home/ubuntu/development/legendstudy-lab-web`.
- [x] Confirmed the selected architecture: Next.js App Router and TypeScript.
- [x] Reviewed the current LegendStudy Wiki and Phase 0/Phase 1 research boundaries.
- [x] Confirmed that the prior Vite/Express/tRPC application is a prototype, not the production architecture.
- [x] Defined the Phase 2 public metadata, private package, and user-private data boundaries.

## Phase 2 implementation checklist

- [x] Established App Router routes, layout, metadata foundation, loading, and not-found UX.
- [x] Created typed reviewed public metadata and official Quick Link fixture subset.
- [x] Implemented Quick Link resolver with canonical fallback and status UX.
- [x] Ported the public catalog, university detail, year/track detail, and source provenance UI.
- [x] Ported synthetic question, keyboard-first writing workspace, temporary draft adapter, and structured mock evaluation.
- [x] Ported My Essays, My Essay Pattern, Score Analysis shell, and Login shell.
- [x] Added server-only future evaluation boundary and lifecycle/entitlement types without real evaluator behavior.
- [x] Added README, architecture, data-boundary, prototype-migration, and handoff documents.
- [x] Added tests, typecheck, lint, production build, route smoke, screenshots, and static boundary audit.

## Known blocked work

- [x] Production Supabase, Auth, RLS, migrations, database tables, and Production data access are out of scope.
- [x] Official question/passage/answer/rubric content, source extraction, and source copying remain blocked pending rights/use and source-review decisions.
- [x] Live provider calls, AI evaluation, credits, ledger, entitlement settlement, and payments remain out of scope.
- [x] Final domain, canonical origin, public deployment, Vercel project, GitHub repository creation, push, PR, and merge require Product Owner approval.

## Phase 1 release-web foundation

- [x] Audited the current local Next.js project, public-route state, mobile styles, environment template, and deployment configuration.
- [x] Added the stable LS LAB entry structure: `/lab`, `/lab/how-it-works`, and `/lab/coverage`.
- [x] Added `/privacy`, `/terms`, `/support`, and `/account-deletion` as explicit draft or foundation-only URLs without claiming live policy, support, or deletion workflows.
- [x] Added a canonical-origin gate, `robots.txt`, sitemap behavior, public metadata, and the existing official LegendStudy app icon for the web icon.
- [x] Kept the existing synthetic, login, personal-history, AI, payment, and account-integration routes out of public navigation and search indexing.
- [ ] Obtain an Owner-approved hosting provider, HTTPS domain, and `NEXT_PUBLIC_SITE_URL` before public deployment.
- [ ] Replace policy drafts with Owner-reviewed, dated, published legal documents that match actual LegendStudy+ data processing.
- [ ] Connect a real support channel and implement an authenticated account-deletion workflow before using policy URLs in Store metadata.
