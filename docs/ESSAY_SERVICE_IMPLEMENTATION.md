# Essay service WEB integration — Oct11

Status PARTIAL / CONTRACT VERIFIED / NO NEW LIVE E2E. APP canonical task evidence:
`wiki/essay-full-service-implementation-20261011.md`, branch
`codex/essay-full-service-implementation`. No native UI rewrite or new backend.

## Mounted student paths

`/essay-lab/` reads existing verified active exams and published questions under
Supabase RLS, separately from retained2027 research preview/current static catalog.
`/essay-lab/write/?question=<uuid>&session=<optional-uuid>` reuses existing Auth,
EssayRuntimeClient, CAS Draft, immutable Submit, canonical status and shared MY.
Question source/metadata available; authorized prompt/passage/figure delivery is
NOT implemented here. Existing official packages remain private. Bound to200
exams and100 questions per exam; larger catalog pagination is future work.

## Closed server entry points

| Endpoint / caller | Required configuration | Behavior |
|---|---|---|
| POST /api/essay/admission | ESSAY_REVIEWED_RUNTIME_ENABLED=true + ESSAY_REVIEWED_WORKER | no billing; authenticated allowed subject + published RLS question + private readiness |
| POST /api/essay/evaluate | same | owner attempt, trusted admission, stable canonical evaluation request, worker dispatch, DB status |
| POST /api/math/recover | MATH_RECOVERY_ENABLED=true + existing narrow worker JWT | owner learning state then unchanged canonical single-job expiry/release |
| runScheduledRecovery | MATH_RECOVERY_BATCH_ENABLED=true + narrow worker JWT | prepared batch20, no schedule registered |

All use existing MATH_ORIGIN, Supabase transport and MATH_ALLOWED_SUBJECTS; no new
allowlist or role. None of these switches/bindings were provisioned or enabled.
Recovery is independent from new evaluation admission. Expected closed responses
must not be presented as completed processing or confirmed Credit release.

Private binding protocol (NOT an implemented hosting service):
`fetch(Request)` `/admission` receives {questionId,metadataVersion}; replies only
when configured rights, official cache, canonical provider policy, independent
reviewer and durable checkpoint are ready. DTO `essay-worker-admission-v1`, exact
questionId/metadataVersion, ready=true, regime `essay-v1.3/policy/<64hex>`, expiresAt
integer epoch milliseconds <=120s. `/evaluate` receives {evaluation_id} plus
verified caller bearer; worker repeats canonical owner/status/snapshot admission
and reuses APP ReviewedRuntimeWorker. Never log Authorization or source bodies.

Host implementation/provisioning remains a blocker. Do not connect a synthetic
adapter or return ready=true to bypass it. Default missing config fails CLOSED
before reservation. Canonical DB settlement is the only completion authority.
Ambiguous dispatch keeps the same evaluation request key; retry of an explicitly
failed job needs owned evaluation and `no_credit_consumed` from the status RPC.
Client never supplies model, regime, Credit amount or private source text.

## Validation / operations

96 related tests PASS +1 optional privateV2 bundle SKIP; lint/typecheck/boundary
PASS. Existing boundary naming assertions updated to Owner's already-approved
수능 LAB. `npm run build -- --webpack` is the verified build command with shared
node_modules symlink; default Turbopack rejects that external symlink.
Guest local browser360/390/768/1280 no horizontal overflow; editor login boundary
verified. Authenticated browser/full-service E2E and200% text scaling not claimed.

No Provider call, Production Credit transaction, migration apply, deployment,
public activation or device QA. Current production questions remain0; this branch
alone cannot activate actual Humanities evaluations. Existing Math E2E and QA
contracts preserved. Next: reviewed private worker hosting + authorized question
body/figure delivery + isolated Auth/PostgREST → specifically allowed live E2E.
