# LS LAB by LegendStudy — Phase 2 Next.js Foundation

This repository is a **local, isolated Phase 2 candidate** for LS LAB by LegendStudy. It replaces the earlier private Vite/Express/tRPC UX prototype as the recommended forward-looking Web foundation, while preserving that prototype unchanged as a reference. It is not connected to the LegendStudy Flutter Mobile repository, Production Supabase, shared authentication, a custom domain, public deployment, a GitHub remote, or a payment/provider system.

It now includes a **Phase 1 release-web foundation** for a future public LS LAB entry. The public route structure, policy-path foundation, canonical-origin gate, release copy, and deployment handoff are documented in [Release Web Foundation](docs/RELEASE_WEB_FOUNDATION.md). This is not a public deployment and it does not make draft policy pages or account deletion Store-ready.

The application establishes a desktop-first, mobile-responsive App Router experience: university metadata discovery, university/year/track detail, source-aware official navigation, synthetic writing practice, structured mock evaluation, My Essays, My Essay Pattern, a future Score Analysis shell, and a Login integration shell. Public metadata and synthetic instructional content are deliberately separated.

## Local runbook

```bash
pnpm install
pnpm dev
```

To validate the production candidate locally:

```bash
pnpm verify
pnpm start
```

`pnpm verify` runs ESLint, TypeScript, unit/component tests, the static client/server boundary audit, and a production build. Scripts explicitly set `NODE_ENV` to prevent accidental builds under an inherited nonstandard value.

## Supported routes

| Route | Role | Data boundary |
| --- | --- | --- |
| `/` | Product framing and trust model | Public product copy only |
| `/essay-lab` | Searchable university metadata catalog | Reviewed public fixture subset |
| `/essay-lab/universities/[universityId]` | University detail and source provenance | Public metadata and official external links |
| `/essay-lab/universities/[universityId]/[year]` | Year/track metadata foundation | Public metadata only |
| `/essay-lab/questions/synthetic-q-01` | Synthetic practice question overview | Synthetic content only |
| `/essay-lab/write/synthetic-q-01` | Keyboard-first writing workspace | Browser-local temporary draft only |
| `/essay-lab/evaluation/mock-attempt-001` | Structured mock evaluation | Synthetic learning signal only |
| `/my/essays`, `/my/pattern` | Personal-history information architecture | Mock fixture only |
| `/score-analysis`, `/login` | Explicit future-scope shells | No score, Auth, or user data |

## Phase 1 release-web routes

| Route | Current role | Publication state |
| --- | --- | --- |
| `/` and `/lab` | LS LAB canonical entry route | Service-preparing copy; the root redirects to `/lab` |
| `/lab/how-it-works`, `/lab/coverage` | Service explanation and boundary disclosure | Service-preparing / foundation-only copy |
| `/privacy`, `/terms` | Policy URL structure | Draft; Owner review required; not published policy documents |
| `/support` | Support URL structure | Owner action required; no live support channel connected |
| `/account-deletion` | Account-deletion URL structure | Foundation-only; no identity, intake, or deletion flow |

No public canonical, sitemap entries, or crawl permission is emitted until an approved production `NEXT_PUBLIC_SITE_URL` is supplied at build time. Earlier Phase 2 demonstration routes remain available for private development but are `noindex` and disallowed in `robots.txt` once a public origin is configured.

## Fixture provenance and limits

The foundation ships five reviewed public university metadata fixtures: **경북대학교, 부산대학교, 광운대학교, 아주대학교, and 서경대학교**. They are manually normalized from the Phase 1 research master dated 2026-09-18. This is neither the complete 42-university catalog nor the 53 recruitment-unit inventory. It includes public labels, official admissions/archive navigation, source status, and an observation date only.

The project **does not** store, mirror, scrape, transmit, or display official question papers, passages, answer keys, detailed scoring criteria, private research notes, source hashes, private package content, or evaluator prompts. An official URL is a source-navigation and attribution feature; it is not content-use permission.

## Phase 2 boundaries

No Production database or Supabase change is part of this repository. It contains no schema, migration, RLS policy, production environment variable, service-role key, user identifier, payment key, provider credential, live evaluator, credit settlement, or background worker. The server-only `src/server/evaluation/` folder defines interfaces and a no-op synthetic adapter only; it performs no AI call, persistence, queue operation, or entitlement decision.

The browser-local draft adapter is a temporary mock boundary. Replace it only after Product Owner approval of shared identity, data ownership, access control, retention, deletion, and incident/appeal flows.

## Required reading before extending

Read [Architecture](docs/ARCHITECTURE.md), [Data boundaries](docs/DATA_BOUNDARIES.md), [Prototype migration](docs/PROTOTYPE_MIGRATION.md), and [Future implementation handoff](docs/FUTURE_IMPLEMENTATION_HANDOFF.md). The current work tracker is [todo.md](todo.md).

Final domain/canonical origin, public deployment, GitHub repository creation or push, shared Supabase Auth, Production Supabase schema/RLS/migration work, official source extraction, source copying, live AI evaluation, credits/payment, analytics, and actual student data each require separate approval.
