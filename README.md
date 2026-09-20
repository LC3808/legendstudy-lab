# LegendStudy LAB — Web Foundation

**LegendStudy LAB** is the separate web foundation for **레전드스터디+**. It is a static Next.js App Router project prepared for a future public entry at `https://lab.legendstudy.com`.

> **Current status:** GitHub and Cloudflare Pages preparation only. This repository has not been deployed, `lab.legendstudy.com` has not been connected, and no Cloudflare or DNS setting has been changed.

The public service name is **LegendStudy LAB**. “LS LAB” is retained only as an internal or short-form label in selected prior foundation copy; it is not a separate product.

## What this repository contains

The project includes public service-preparation routes, clear scope disclosures, and separate private-development foundations. It does **not** connect to the Flutter app repository, Supabase Production, shared authentication, payment, AI evaluation, personal data, content mirroring, or an account-deletion backend.

| Public route | Current role | State |
| --- | --- | --- |
| `/` | Redirect rule to `/lab/` on Cloudflare Pages | Static fallback also available |
| `/lab` | LegendStudy LAB introduction | Service-preparing copy |
| `/lab/how-it-works` | Planned service flow and boundary | Service-preparing copy |
| `/lab/coverage` | Supported scope and non-features | Foundation-only copy |
| `/privacy`, `/terms` | Policy URL foundations | Draft; Owner review required |
| `/support` | Support URL foundation | No live contact channel |
| `/account-deletion` | Account deletion URL foundation | No deletion intake or API |

Earlier catalog, synthetic writing, mock evaluation, login, My, and score-analysis routes remain as private development foundations. They are intentionally absent from public navigation and must not be represented as live services.

## Development environment

| Item | Requirement |
| --- | --- |
| Framework | Next.js 16 App Router with React 19 |
| Package manager | pnpm 11 |
| Node.js | `>=22 <23` |
| Build mode | Static export (`out/`) |
| Intended production URL | `https://lab.legendstudy.com` |
| Intended deployment environment | Cloudflare Pages |

Install and start local development:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Run all repository checks:

```bash
pnpm verify
```

Run the tracked-file, generated-artifact, environment-file, and secret-value audit before a GitHub push:

```bash
pnpm audit:github-ready
```

Create the static production output:

```bash
NEXT_PUBLIC_SITE_URL=https://lab.legendstudy.com pnpm build
```

The output directory is `out/`. Do not commit `out/`, `.next/`, `node_modules/`, local logs, credentials, or environment files.

## Environment variables

The current static build has one optional build-time public setting:

| Variable | Example value | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://lab.legendstudy.com` | Enables canonical URLs, the public sitemap, and permitted crawler metadata for the approved production origin |

There are **no required secrets** for the current static release. Do not store Cloudflare tokens, Supabase credentials, OAuth secrets, AI API keys, payment secrets, or private keys in this repository. Configure any future real values only in the hosting provider’s encrypted environment-variable settings.

Without `NEXT_PUBLIC_SITE_URL`, the build deliberately emits `noindex`, disallows crawling, and creates an empty sitemap so temporary previews never become the canonical service URL.

## Cloudflare Pages preparation

The project now uses `output: "export"`, so it is compatible with **Cloudflare Pages’ static Next.js export** flow. The anticipated Cloudflare Pages settings are:

| Cloudflare Pages setting | Value |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) |
| Production branch | `main` |
| Build command | `pnpm build` |
| Build output directory | `out` |
| Node.js | 22.x, subject to the Cloudflare build-image setting selected by the Owner |
| Cloudflare build configuration | `NODE_VERSION=22.13.0` and `PNPM_VERSION=11.24.0` to pin the tested toolchain |
| Build environment variable | `NEXT_PUBLIC_SITE_URL=https://lab.legendstudy.com` after the domain is approved |
| SPA fallback | Not required; this is a static Next.js route export, not a client-only SPA |
| Redirect configuration | `public/_redirects` supplies `/ → /lab/` with HTTP 308 on Cloudflare Pages |

Cloudflare Pages is appropriate only for this **static** release foundation. If the project later requires server-side rendering, Server Actions, route handlers, middleware, authenticated app session transfer, payment, or live AI features, the architecture must be reviewed for Cloudflare Workers (for example vinext/OpenNext) rather than treated as a Pages-only static site.

## Before extending or deploying

Read [Architecture](docs/ARCHITECTURE.md), [Data boundaries](docs/DATA_BOUNDARIES.md), [Prototype migration](docs/PROTOTYPE_MIGRATION.md), [Future implementation handoff](docs/FUTURE_IMPLEMENTATION_HANDOFF.md), and [Release Web Foundation](docs/RELEASE_WEB_FOUNDATION.md). The local work tracker is [todo.md](todo.md).

A public deployment still requires Owner approval for the final host, public copy, privacy policy, terms, support channel, account deletion process, content rights, and all real data flows.
