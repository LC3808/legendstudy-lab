# LS LAB Prototype Migration Outline

## Context

The earlier private Vite/React/Express/tRPC application at `/home/ubuntu/ls-lab-web` remains an intact UX prototype and reference. The Phase 2 candidate at `/home/ubuntu/development/legendstudy-lab-web` is a **separate local Git repository**. No files were copied into the active LegendStudy Mobile repository, no existing repo was reset, and no GitHub remote was created, pushed, or merged.

## Reused concepts and intentional changes

| Prototype capability | Phase 2 Next.js treatment | Reason |
| --- | --- | --- |
| Home → catalog → university → question → write → evaluation → My flow | Reimplemented as App Router routes. | Supports server-rendered public entry pages and route-level metadata. |
| Five-card university fixture | Replaced with typed reviewed public metadata fixture. | Adds source status, canonical Quick Links, checked date, explicit `OFFICIAL_SOURCE` origin, and no implicit fallback. |
| `wouter` navigation | Replaced by filesystem routes and `next/link`. | App Router routing and metadata. |
| Vite SPA pages | Server Components by default; filters/editor are narrow Client Components. | Reduces browser bundle responsibility and preserves future server boundary. |
| Browser-local draft | Retained behind a `client-only` temporary adapter. | Demonstrates UX without identity/data persistence. |
| Synthetic question and feedback | Retained, but typed and labelled `SYNTHETIC_CONTENT`. | Prevents any appearance of official source or live AI content. |
| Generic tRPC server scaffold | Not migrated. Replaced by server-only future contract types only. | The first approved production backend should be a public metadata/Quick Link service, not an evaluator endpoint. |
| Mock My Essay Pattern | Retained as a typed synthetic information architecture. | Preserves product concept without collecting student data. |

## Migration sequence after approval

1. Freeze the Phase 2 candidate as a reviewed baseline and choose the final hosting/domain policy.
2. Design and approve a public metadata API. Ingest only approved `PUBLIC_METADATA` with source-version, review status, canonical link, and stale/broken-link controls.
3. Agree on LegendStudy identity mapping, session behavior, account linking/unlinking, retention, deletion, access controls, and privacy notices. Do not perform a silent shared-auth switch.
4. Replace local draft storage with authenticated user-owned drafts only after the personal-data design passes review.
5. Establish private source and evaluation package operations. Rights/use decisions, reviewer workflow, source versioning, benchmarks, and a kill switch are prerequisites.
6. Build a protected server evaluation endpoint that resolves package, permission, rate limit, and credit rules server-side. It must return a clearly labelled learning signal or safe refusal.
7. Connect My Essays and My Essay Pattern only to user-owned stored attempts and versioned results.
8. Add payment/credits, analytics, and a public rollout only after the product, rights, security, quality, and operating gates are explicitly approved.

## Avoid these migration errors

Do not upload the Phase 1 research master into a public client bundle. Do not treat an official Quick Link as permission to parse or expose a paper. Do not allow a client to submit a rubric, raw source URL, model/provider selection, credit amount, or score semantics. Do not replace local mock labels with ambiguous “AI score” language. Do not introduce a production database migration, RLS change, or Supabase credential just to make a demo look live.
