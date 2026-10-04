# MATH-PRODUCTION-ACTIVATION-1

2026-10-04 — additive student route / activation candidate. **OFF, not deployed.**

Authority: preserve Claude closeout [MATH-RELEASE-CLOSEOUT-1](MATH-RELEASE-CLOSEOUT-1.md), `6dec4f98887cee2e7c661996e083289b853054b3` (405/40). APP current release `0570099c98929b27f8e484210efc14fe061e8476` (936 Flutter PASS, deletion/erasure/account-switch improvements) supersedes older deletion assumptions. Canonical MATH-2C/D/E SQL bytes and included reevaluation336h policy unchanged. Payment code untouched; separate account-deletion LAB ref e512974 remains separate.

## Delivered

`/math/` uses existing input, correction, learning/hint/solution, re-solve, delta and history components. Essay LAB links it only when build flag `NEXT_PUBLIC_MATH_ENABLED=true`; default false. Owner Auth session is provided by existing AuthContext; keyed workspace clears on identity switch. Bounded requests, explicit busy/error/empty states, immutable answer submission and stable per-action idempotency keys. Blob-only local image preview and explicit PDF new-tab preview revoke their URLs on unmount/change. No operator quality component is imported.

Pages Functions `/api/math/upload`, `/api/math/extract`, `/api/math/evaluate` derive identity from verified Auth, use owner-scoped reads before privileged claims, and keep worker/model credentials server-only. Upload verifies actual byte reread and hash (including interrupted duplicate upload), exact metadata/MIME magic, size limit20MiB. Provider syntax/semantic failures are closed; canonical SQL finalize owns billing and learning. No model is selected by default; current Responses adapter is a candidate, `store:false`, bounded output/timeout, server-pinned model identity. [Official Responses format reference](https://developers.openai.com/api/docs/guides/structured-outputs).

Integration corrections: actual SQL `reasoning_required`, nullable selected extraction, extraction row `id`, candidate `run_id`, criteria official_points and solution origins differ from prior domain mocks. Explicit physical adapter preserves canonical question/typed work/extraction/source pins and serializes domain output to actual SQL. Domain TypeScript types are no longer mislabeled an exact SQL wire format. Gateway ownership uses `math_learning.read_learning_state`, which supports REQUESTED; `math_input.read_result` is completed-only. Completed repeat gateway requests do not reclaim or call provider. Uncertain finalize transport is never blindly compensated.

## Configuration (Owner only, after exact DB package approval)

Cloudflare → Workers & Pages → explicitly approved LAB deployment project → Settings → Variables and secrets. Choose the approved environment; do not copy Payment test credentials or change existing Production configuration during this preparation task.

| Name | Type | Meaning |
|---|---|---|
| NEXT_PUBLIC_MATH_ENABLED | Text/build | false until approved route exposure; rebuild required |
| MATH_ENABLED | Text/server | false until gateway approved |
| MATH_PROVIDER_CALLS_ENABLED | Text/server | false until explicit paid-call approval |
| MATH_ORIGIN | Text | exact approved HTTPS origin, no trailing path |
| MATH_SUPABASE_URL | Text | approved LegendStudy DB URL |
| MATH_PROJECT_REF | Text | exact matching project reference; URL mismatch fails closed |
| MATH_SUPABASE_PUBLISHABLE_KEY | Text | same project's publishable key |
| MATH_EXTRACTION_WORKER_JWT | Secret | finite approved role JWT; never NEXT_PUBLIC |
| MATH_EVALUATION_WORKER_JWT | Secret | finite approved role JWT; never NEXT_PUBLIC |
| MATH_PROVIDER | Text | OPENAI only if candidate approved; no automatic selection |
| MATH_PRIMARY_MODEL | Text | explicitly selected model after controlled evidence |
| MATH_PROVIDER_API_KEY | Secret | Owner sets directly; never copied to chat/Git/log |

Account deletion worker uses existing server credentials and `MATH_STORAGE_ENABLED=true` only after additive helper installation. APP package contains exact migration/hash/order/preflight/postflight/kill switch: [Owner runbook](https://github.com/LC3808/legendstudy-app/blob/codex/math-production-activation-1/supabase/verification/math_essay/activation/README.md).

## Verification scope

- Full LAB regression:424 tests /45 files; TypeScript, ESLint, boundary and static export checks. No test removed/skipped.
- Deployable handler synthetic HTTP tests: duplicate upload byte reread/admission, differing bytes denied, foreign extraction stopped before worker/provider.
- Real PG17 canonical claim → this TypeScript physical adapter → canonical finalize: initial -1 Credit and eligible included reevaluation0. APP package records exact SQL evidence and recovery/erasure cases.
- Existing consumer journey plus actual route integration: typed answer, image correction/confirmation, evaluation, hint, explicit two-step solution reveal, re-solve, included reevaluation, history, identity switch. These tests use synthetic transport, not Hosted Auth/provider.
- Actual browser rendered route with local-only synthetic Auth/RPC fixture: desktop1280,360,320;320 at200% text. [Measured widths](../verification/math-activation-20261004/layout.json), [screenshot](../verification/math-activation-20261004/route-320-200.png). No horizontal overflow. Temporary local page removed before build/commit. This is not physical-device keyboard verification or live provider E2E.
- Secret-canary static export with route ENABLED: `scripts/verify-math-release.mjs` checks24-module browser import graph, operator console exclusion and exported assets for provider/worker bindings and synthetic canaries. Actual secrets were never read or used.

## Controlled model gate

Retain MATH-3C-1 `src/lib/math-input/bakeoff/{manifest,runner,scoring,report}.ts`. It is a deterministic extraction benchmark, not evidence of real provider accuracy. Existing visual `evidence://bakeoff` fixtures are synthetic metadata; Owner-approved real-model run must supply synthetic image/PDF bytes and map returned regions to these expected fixtures. No PRIMARY_MODEL or winning vendor inferred from mock scores.

Minimal proposed gate: one approved candidate, one pass across8 synthetic cases (correct, wrong reasoning, wrong final answer, partial, alternative valid path, legible image, ambiguous image, multi-step derivation), no automatic retries/fallback fan-out. Before running, Owner approves specific model, credential location and explicit spending cap; meter actual usage. Require schema-valid canonical finalize, ambiguity preserved, root/propagation soundness, non-answer-leaking hints, suitable solution and included reevaluation. Use existing extraction scorer/report; independently inspect evaluation reasoning. Any unsafe case blocks selection. No student answers; no Production call without separate authorization.

## Release judgement

Consumer COMPLETE. Student route/code deterministic PASS. Backend activation package READY, not applied. Actual Hosted private byte lifecycle and gateway-role admission, real-model bake-off and integrated end-user smoke remain unverified external gates. **MATH_END_USER_E2E BLOCKED; MATH_RELEASE_CANDIDATE NO.** Preparatory work does not certify a real-model educational product. Production writes0, provider calls0, Toss calls0, student dataNO, Payment codeNO, main mergeNO. Next: Owner review → exact approved isolated/Production activation → controlled model selection/smoke → final end-user verification → route enable.
