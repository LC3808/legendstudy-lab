# Essay service WEB integration — Oct11

Status PARTIAL / CONTRACT VERIFIED / NO NEW LIVE E2E. APP canonical task evidence:
`wiki/essay-full-service-implementation-20261011.md`, branch
`codex/essay-full-service-implementation`. No native UI rewrite or new backend.

## Oct11 runtime/catalog continuation (current)

Public pages now consume `src/data/essay-public-catalog.json`, generated from retained
Manus V2 source:42 universities/49 offerings.27 existing Production UUID matches and
15 explicit nulls; original sourceUniversityId is reused, no WEB-specific identity.
Home/list/common detail/admission-year routes replace the five public sample list.
Search, three combined offering filters and12-per-page pagination preserve campuses,
official sources and2027 admission vs actual past-exam years. Source links retain
existing verification dates; no new42-site research or invented academic metadata.
Core candidates stay internal and Owner-undecided. See data README for regeneration.

The existing Python ReviewedRuntimeWorker now has APP `runtime_host.py` private
WSGI/admission/evaluate adapter; Pages worker-binding supports existing service
binding or explicit HTTPS origin/internal token. Rights/visual-content/provider/
reviewer/persistence preflight fails closed. Online Auth/allowlist/RLS, durable
journal, reviewer source/receipt sink and deployment composition remain required;
this is not a provisioned runtime. No current live Humanities Provider proof.

Writer keeps Sep28 APP f153c43/ebbc43c42:58 desktop and mobile tabs. Shared RecordDetail
renders stored results in approved order, five-level label/star/details, core
priorities, direct 다시 써보기 and separately labeled/collapsed AI vs official examples.
Actual selected previous evaluation is required for comparison; no forced pairing.
Official student passage/figure delivery and real tone/feedback acceptance remain
incomplete. Native APP unchanged, same canonical history and credit contract.

Current checks:1014 WEB PASS +1 optional private V2 fixture skip (110 files),26 Python
contract PASS using synthetic HTTP. Lint/types/boundaries/build PASS, existing Node22.
Browser catalog/detail360/375/390/768/1280/1440 no overflow; catalog/detail200% root-font32px
simulation passes (temporary build style removed). Search/pagination/combined filters
and missing-university Empty State checked. Localhost Auth intentionally closed by
existing origin policy, unchanged; authenticated writer/result visual E2E pending.
Separate anonymous actual PostgREST GET: published questions200/0 rows, verified
exams200/21 rows. Production SQL general evaluation0, Math completed8/failed1.

Cloudflare read-only current: production source501d272, deploymenta2e09fea; Math
switches false, general runtime/recovery switches unset, allowlist preserved. Opaque
worker JWT validity cannot be inferred. No deployment, Provider/Credit/data write or
migration apply. Earlier QA metadata consumers await paired migration/deployment
approval; do not bypass that review with an accumulated-branch deployment.
APP canonical Wiki and `supabase/verification/essay_service/runtime-integration-review.md`
record impacts/rollback and exact activation prerequisites. General public HOLD.

The following sections document the previous full-service checkpoint; their old
catalog and missing-adapter descriptions are superseded above, not their gates.

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
