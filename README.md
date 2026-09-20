# LegendStudy LAB — Production Landing

**LegendStudy LAB** is the public essay-learning service foundation for **레전드스터디+**. The production landing is available at [https://lab.legendstudy.com](https://lab.legendstudy.com).

> **Current public scope:** The website introduces the service direction and its current boundaries. It does **not** offer live AI feedback, payments, subscriptions, credits, shared app accounts, answer persistence, official-source copying, or account deletion.

## Public information architecture

| Route | Purpose | State |
| --- | --- | --- |
| `/` | Canonical LegendStudy LAB introduction | Public and indexable |
| `/lab/` | Legacy compatibility alias | Cloudflare Pages redirects to `/` with HTTP 308 |
| `/lab/how-it-works/` | Service direction and current boundary | Public and indexable |
| `/lab/coverage/` | Supported scope and explicit non-features | Public and indexable |
| `/privacy/`, `/terms/` | Policy URL foundations | Draft; noindex; Owner review required |
| `/support/` | Support URL foundation | No live contact channel |
| `/account-deletion/` | Account deletion URL foundation | No deletion intake or API |

Earlier catalog, synthetic writing, mock evaluation, login, My, and score-analysis routes remain private development foundations. They are absent from public navigation and must not be represented as live services.

## Development environment

| Item | Requirement |
| --- | --- |
| Framework | Next.js 16 App Router with React 19 |
| Package manager | pnpm 11 |
| Node.js | `>=22 <23` |
| Build mode | Static export (`out/`) |
| Production URL | `https://lab.legendstudy.com` |
| Production host | Cloudflare Pages |

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm audit:github-ready
NEXT_PUBLIC_SITE_URL=https://lab.legendstudy.com pnpm build
```

The output directory is `out/`. Do not commit `out/`, `.next/`, `node_modules/`, local logs, credentials, or environment files.

## Build-time configuration

| Variable | Production value | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://lab.legendstudy.com` | Canonical URLs, public sitemap, robots metadata |
| `NODE_VERSION` | `22.13.0` | Cloudflare Pages build runtime |
| `PNPM_VERSION` | `11.24.0` | Cloudflare Pages build runtime |

There are no required secrets for the current static release. Do not add Cloudflare tokens, Supabase credentials, OAuth secrets, AI API keys, payment secrets, or private keys to this repository.

## Static hosting behavior

The project uses `output: "export"` and `trailingSlash: true`. Cloudflare Pages serves `public/_redirects`, which redirects the legacy `/lab/` route to the canonical `/` route with HTTP 308. The generated static `/lab/` file remains a safe noindex fallback for hosts that do not apply redirect rules.

Cloudflare Pages is appropriate for this static release. If the project later needs server rendering, Server Actions, authenticated sessions, payment, live AI features, or server-side data processing, the architecture must be reviewed for a compatible server runtime before implementation.

## Before extending live functionality

Read [Architecture](docs/ARCHITECTURE.md), [Data boundaries](docs/DATA_BOUNDARIES.md), [Prototype migration](docs/PROTOTYPE_MIGRATION.md), [Future implementation handoff](docs/FUTURE_IMPLEMENTATION_HANDOFF.md), and [Production Landing and Route IA](docs/RELEASE_WEB_FOUNDATION.md). The project work tracker is [todo.md](todo.md).

Any future account, AI, payment, source-content, or user-data feature requires its own rights, security, privacy, product, and operating review before release.
