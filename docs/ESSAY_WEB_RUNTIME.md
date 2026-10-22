# Essay Web runtime activation — 2026-10-08

Status: PARTIAL. This release restores the existing Math consumer and server gateways
behind closed admission; it does not establish public, four-type evaluation readiness.

## Current authority

APP Store RC a3cc3b3310453502c3653b788c59aa1059400a7f (backend unchanged from ca60d73).
LAB Math source: codex/math-production-activation-1,34bfab5c962c6a79d91ca1eae3ec3907b4185489.
Only absent Math input/evaluation/learning/consumer/gateway files were reconciled;
no whole-branch merge, operator frontend, shared visual or payment code was copied.
APP gateway essay_live_gateway.dart supplies Humanities session/CAS/idempotency semantics.

Owner Production inventory: 0 published Essay questions,0 Essay criteria; Math has
1 problem set,1 problem,1 leaf,1 ACTIVE profile. These counts do not verify reviewed
content or model readiness. math-private is private,20MiB,PNG/JPEG/WebP/PDF.
Existing C/D/E and Oct04 storage activation migrations are installed.010 is absent.

## Implemented

- `/api/essay/availability`: authenticated, no-store read admission using existing
  server config, Auth-verified narrow subject allowlist, unexpired worker JWT role
  metadata, existing DB kill switch through candidate010, and nonempty Math catalog.
  No provider calls, billing or secret/subject values in the response.
- `/math/` and Essay LAB entry reuse the Math student consumer. Missing config,
  missing010, closed DB switch, unknown subject or read failure cannot advertise Math.
  The existing max10-subject test boundary remains; this is not a public launch.
- `/api/math/upload|extract|evaluate` reuse existing private-storage/hash/owner gates,
  pinned provider configuration, validated output and finalize semantics.
- Humanities Web client adapter reuses canonical RPCs: deterministic APP session and
  request keys, CAS draft save, immutable submit, evaluation/status/result and bounded
  history. Default writes disabled. It is tested with fixtures, NOT mounted as a live
  Humanities editor or backed by a newly deployed worker.
- Account-keyed runtime entry drops in-flight availability after user switch. Login
  uses the existing `next` destination contract. Existing demo editor remains clearly
  labelled browser-only practice; its simulated feedback is not a live evaluation.

## Types and remaining gaps

| Type | Status | Required before public availability |
|---|---|---|
| Humanities/social | BLOCKED | reviewed published questions/criteria, deployed trusted worker/provider admission; current Python worker is synthetic-only |
| Economics/business mixed | BLOCKED | reviewed capability bindings and atomic shared billing/result coordinator; no independent per-child charges |
| Math | IMPLEMENTED, activation BLOCKED | verified content/profile, existing server bindings/model approval, DB switch/admission and authenticated end-to-end verification |
| Science | BLOCKED | reviewed science evaluator/rubric/golden fixtures; no inference from text/image format |

Exam category and question capabilities remain distinct. Humanities/mixed/science
availability is explicitly false. Math does not imply science or economic reasoning.
Negative routing tests are NOT successful integration tests for those three types.

## Credit, storage and learning

SQL remains the sole ledger/reservation/settlement/release authority. No wallet,
manual credit, eligibility change, refund shortcut or client-side charge calculation.
Existing Math tests cover owner denial before worker claim, duplicate completed retry,
validated finalization, transaction rollback, private upload verification, included
reevaluation eligibility/336h expiry, re-solve and append-only learning history.
Ambiguous failure remains pending/reconciling, never an invented successful release.
Humanities included-rewrite policy requires separate live verification; do not infer
its expiry from Math's336h tests. No private artifact becomes a public URL.

## Deployment and operating limits

010 only adds a read RPC projecting the existing kill switch; it does not open it.
Candidate lives in APP codex/essay-web-runtime. No whole db push or005. No Production
DB apply has been performed from this environment: no Supabase credential binding,
DB URL, privileged connector or installed authenticated CLI was available. Environment
configuration metadata also contained no secret/runtime bindings. Cloudflare privileged
configuration access was absent; Git-based deploy is separate from provider activation.

No live provider call, authenticated student E2E, synthetic content publication or
actual Credit consumption is claimed. Owner-away override is respected: no SQL Editor,
terminal, intermediate approval or secret-in-chat request. Remaining operational
access and content/provider prerequisites are collected in the final closeout.

Preserved: Signup CLOSED; Target005 HOLD; Payment/Toss/IAP unchanged; MY/Admin and
Manus Header/Icon/Favicon/global CSS unchanged by this task.

## 2026-10-12 material ingestion follow-up (supersedes old runtime inventory only)

Owner local ZIP inventory and readonly production inspection: 20 archives, 1,030
unique PDFs, 21 catalog university mappings. DB has 22 essay_exams (21 verified
catalog exams + 1 synthetic Math record), **0 essay_questions**. This does not
invalidate existing Math E2E or count Math's separate questions as missing.

`scripts/essay-materials/` builds private metadata/text review candidates. 581 review
groups are NOT verified exams. SKKU2025 language session1 exact-source package is
reused (3 existing structures); no other package is marked executable. Source files
and derived private text never enter Git. Provider transmission rights are unverified.

`server/exam-unit.ts` is an unmounted contract candidate: same-exam immutable set,
unchanged-answer inheritance, 14-day/one-rewrite eligibility, version-bound comparison.
It does not reserve or consume Credit. Repeated legacy question RPC calls are forbidden
as an implementation of one exam credit. Existing composition is unbilled but its
current parent persistence still targets a single question; it is not an exam bridge.

Storage SQL under the tooling directory is a local, automatic-rollback rehearsal,
not a deployable migration. Dependencies were stubbed for PostgreSQL17 checks.
Remaining: exact question membership/snapshot/lifecycle guards, account/cycle locks,
atomic reservation/settlement/release, lease fencing, authenticated History/QA projections,
real-schema concurrency and rollback tests. Source questions and rights must be reviewed
before an end-to-end test plan can be executed. No production apply/deploy/Provider call.

Essay gateway now preserves **confirmed reservation** HTTP402/PT402 and422/PT422
without exposing DB diagnostics. Unknown network/worker outcomes keep existing pending
status behavior, including worker402/422 AFTER reservation. Shared Math transport and
ledger untouched. Current admission.ts directly calls readReviewedAdmission with a
bound worker; the old callEssayGateway/ctx review location does not exist at this HEAD.
Other Grok issues remain separate; no blanket claim that the review is resolved.

Canonical policy/status and handoff live in the existing Unified Wiki. Public AI HOLD.

## Oct14 shared exam API connection — LOCAL VERIFIED / OPERATING HOLD

The new /api/essay/exam route verifies Auth/allowlist, checks the private reviewed
host before reservation, calls the shared worker-only exam RPC and preserves run/key
on ambiguous dispatch. Native uses the same endpoint. No worker secret reaches
clients. ESSAY_EXAM_RUNTIME_ENABLED defaults OFF and is not configured by this change.
Existing writers, result cards, comparison and History are reused. Eligible parent
selection requests same-set free rewrite; server owns eligibility and revision pins.
No new result screen, Provider, Ledger, PDF/admin UX or Math/payment change.

16 focused tests, typecheck, changed-file ESLint and Node22 webpack build PASS.
An earlier full suite hit a pre-existing source-registry null-ID expectation; do not
claim full suite PASS. New DB API/policy candidate and private host are not deployed.
No real Provider/Credit E2E, production release or public activation in this step.
Canonical status and SQL impact/rollback are in APP wiki/essay-runtime-completion.md
and supabase/candidates/essay_exam_unit/README.md, mirrored in Unified Wiki.

## 2026-10-23 reviewed exam public admission
Owner authorizes activation only after operating E2E. `ESSAY_PUBLIC_EXAMS` is a server-only CSV of approved exam UUIDs; only an exact valid match opts the essay route into real Auth without the operator allowlist. Worker/DB reviewed-package readiness and account/ownership/Credit contracts still apply. E2E scope, when configured, remains a hard bound. Math and worker-auth diagnostics keep their allowlist. Public deployment must remove the stale fixed-key E2E scope explicitly. Initial approved target: Konkuk humanities question2; no implicit release of other questions or universities.
45 focused regressions, Typecheck/Lint/Boundary PASS. Existing UI/build assets unchanged; runtime deployment and user-screen verification reported separately.
