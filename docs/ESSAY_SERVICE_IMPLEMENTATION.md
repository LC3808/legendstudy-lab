# Essay service WEB integration — Oct11

Status PARTIAL / CONTRACT VERIFIED / NO NEW LIVE E2E. APP canonical task evidence:
`wiki/essay-full-service-implementation-20261011.md`, branch
`codex/essay-full-service-implementation`. No native UI rewrite or new backend.

## Oct11 Demand data integration — COMPLETE / LIVE

Recovered the existing44-campus applicant workbook (SHA256
`5bac5decaf773096df341f1037154c0748f1f2f667d4f29087e10d4cdc001efb`). Its own notice
says all counts/rates await official cross-verification. Scoped research extraction
`data/research/essay-demand-2027.json` links all44 rows to existing42 canonical IDs;
Korea Sejong/Yonsei Mirae remain distinct rows with exact existing offering IDs.
Other multi-campus scope is not inferred, and records are never automatically summed.
`project-catalog-demand.mjs` creates the verified-only public sort projection. No
provisional numbers reach the browser; Owner22 policy remains separate from reported
ranks/counts. Default unknowns now use Owner order, explicitly superseding the earlier
alphabetical fallback: Gachon→Cau→SKKU. Name sort stays alphabetical; future verified
2027 totals precede unknowns within each cohort. Deferred Kangnam/Eulji remain last.
All42/49,30 preparation,22 focus and existing design/contracts preserved. Public HOLD.
Deployed source `2f22fe62cf79299f356eb0f797846b9235bd3b4a`, Pages
`ff21b878-c428-494e-bdae-2870c90cbe13`, success2026-10-11T03:10:03.465758Z.
117 WEB files/1041 PASS,1 optional skip; lint/types/build/audits PASS. Live all42,
exact Owner22 order, tail2, filters/search/name sort/Cau detail/mobile verified.
Config maps/allowlist unchanged. Rollback28e4c1ff/source00106fb. Source verification
remains pending; implementation/deployment complete. Canonical APP task/Wiki below.

## Oct11 Catalog sorting correction — LIVE / statistics unavailable

Default service priority: gate-approved actual service, fixed Owner22, additional
Seoul/verified >=8000 cohort, future service; Kangnam/Eulji explicitly last.
Current public HOLD supplies no ready university. Published question presence never
promotes readiness. Filters preserve the canonical university cohort and all42/49.
Within groups verified2027 totals descend, unknowns use Korean name order. No
verified applicant/rate totals exist in retained data; applicant/competition options
therefore transparently fall back to names. Owner22 order is not fabricated statistics.
1034 WEB tests PASS/1 optional skip; lint/types/build/boundary audits PASS.
Six widths360–1440 checked; 200% text simulation prompted removal of fixed filter
heights. Production source `00106fb46fb774fbddd6318c0ddd0a920acc2846`, Pages
`28e4c1ff-9c0d-4104-89da-e93a3bd6aa26`, success2026-10-11T03:01:04.376194Z.
Live all4 pages:42 distinct, first22 Owner cohort, last Kangnam/Eulji; search/filter/
all sort options and6 responsive widths PASS. Production config/allowlist unchanged.
Rollback `997c9086`/`2fa8af7`. Exact Gachon/Cau/SKKU numeric order is unverified;
explicit missing-statistics alphabetical fallback applies inside groups. Canonical
APP `wiki/essay-full-service-implementation-20261011.md` records full evidence.

## Oct11 Owner visual fidelity — DEPLOYED / official logo1 pending

Source `2fa8af7f0794f9f0a2e13225f42b8ede9d6db8c9`, Pages
`997c9086-0147-4fd4-9cac-a7d56990e85c`, success2026-10-11T02:47:15.580263Z.
41 official logos with URL/date/SHA manifest; Sogang temporary monogram. No image
fabrication/recolor/crop; original white marks use a dark contrast surface. Cards
match the target's logo/region/types/three icon rows/black CTA hierarchy; actual
source data overrides illustrative labels.42/49,30/22 and all service gates retained.
114 WEB files/1026 PASS,1 optional skip; Python5/lint/types/build/audits PASS. Six
widths/200% text simulation and live domain screenshots/search/detail/disabled states
verified. Target and actual screenshots compared side-by-side; no activation changes.
Env maps/allowlist identical. Rollback `437bd406` / `d39cb5b`. Later docs-only commits
are distinct from deployed source. [Canonical policy and evidence](https://github.com/LC3808/legendstudy-app/blob/codex/essay-full-service-implementation/wiki/essay-full-service-implementation-20261011.md#oct11-university-catalog-visual-fidelity--ui-live--logo1-pending).

## Oct11 Catalog/detail UX final refinement — COMPLETE / LIVE

Production source `d39cb5b29565ae48ccd31188402d347e72145388`; Pages
`437bd406-9afe-4a5c-80da-98d098802ac9` succeeded2026-10-11T02:10:07.770175Z.
Actual domain catalog/detail/search/filter/mobile/empty-state QA passed. Production
configuration maps, allowlist and disabled evaluation flags unchanged; public HOLD.
Rollback: `9d802cb2-13c8-42b1-8909-6c2bcccde573` / `35fd8f97aa791aeb2bdc855c8c06a3ab7a22f867`.

White/shadow cards/Navy CTA and structured detail reuse52 scoped Master rows plus10
research records/27 official references.42/49 public,30 preparation,Owner22 focus and
GroupA4/B18 preserved. Unknown statistics are not ranked;主要 대학=22+Seoul=32.
Final live-QA correction hides unresolved source notes without changing raw research.
1022 WEB tests +5 Python PASS,1 optional skip; lint/types/build/boundaries/audit PASS.
Six widths and200% text-size simulation checked. No Provider/Credit/DB/device change.

[Canonical policy, full release evidence and verification limits](https://github.com/LC3808/legendstudy-app/blob/codex/essay-full-service-implementation/wiki/essay-full-service-implementation-20261011.md#oct11-catalogdetail-ux-final-refinement--complete).
Future runtime/migration approvals remain separate; documentation commits after this
release do not change the deployed source SHA. Prior records below are historical.

## Oct11 Catalog Production release + Owner scope correction — COMPLETE

Catalog-only release is live at https://lab.legendstudy.com/essay-lab/ . Cloudflare
canonical deployment `9d802cb2-13c8-42b1-8909-6c2bcccde573` succeeded at
2026-10-11T01:30:33Z, source `35fd8f97aa791aeb2bdc855c8c06a3ab7a22f867` (pushed and
remote SHA verified before deployment). Direct Pages upload of webpack static output
and compiled Functions used existing project/production branch selector; no Git main
merge. Subsequent changes in this closeout are documentation only.

**Current preparation scope: minimum20, metropolitan minimum15, Pusan+Kyungpook
required; no upper cap.** Restore the existing Manus30-university inventory in full:
30 A-stage universities,28 unique metropolitan (21 with Seoul offerings,11 with
Gyeonggi/Incheon offerings,4 overlap), plus Pusan/Kyungpook. Previous11 was a mistaken
planning subset of10 detailed research entries plus Pusan, never a code/API cap.
All11 remain;19 less-reviewed candidates restored. APP `wiki/roadmap-essay-lab.md` §16
is the canonical30-row A–H readiness matrix and source/identity/type comparison.
The historical10–15 Core strategy is not a current scope limit. Final named Core
approval was not found in available records; preparation membership does not infer it.
Gangnam/Eulji remain public and special-format deferred. All42/49 public data unchanged.

Live UI QA:42 distinct university names across4 pages; search; all region/type/year
controls; same-offering campus filters; Pusan/SKKU/Eulji common detail and2027 route;
source URLs and actual-question empty states. Science+metro returns2, Math returns19,
economics returns0 from verified data (no invented mappings). Catalogue and Pusan
long-campus detail have no overflow at360/375/390/768/1280/1440. Separate copy of the
same built HTML at root-font32px (200% text simulation) passes catalog/Kyungpook detail
at all6 widths; this is not a claim of live browser text zoom or native device QA.

Preflight:111 WEB files/1016 passed/1 optional private-source skipped; lint/types,
client/server boundaries, secret/path audit and Node22 webpack build PASS. Actual
production public client config reused. Production env including allowlist compares
exactly equal before/after; Math flags false, reviewed-runtime/recovery flags unset.
Read-only postflight Math COMPLETED8/FAILED1, general questions/evaluations0 unchanged.
New Provider calls/Credit transactions/DB changes0. Direct command-line admission
probe hit Cloudflare403 before app code, not counted as application-gate E2E evidence.
Gate preservation evidence is unchanged server configuration, UI and regression tests.

No migration was required: nullable additive quality metadata accepts existing legacy
RPC responses with explicit unknown-user state; action/cursor contracts unchanged,
legacy list/detail/filter regression PASS. This bounded release authorization supersedes
the prior accumulated-branch deployment hold below. Pending metadata/recovery migrations
remain NOT_APPLIED; evaluation/public activation HOLD. Actual official Humanities
Worker/Provider/content readiness remains incomplete, independently of this release.

Rollback: previous Pages deployment `a2e09fea-6472-407b-b0f9-036642a6ed69` (501d272),
without DB rollback. Rollback was not needed or executed. Payment/Toss/IAP, Credit
Ledger, Auth/Profile/RLS/private storage and existing Math E2E contracts preserved.

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

## Oct16 launch gateway preflight — LOCAL PASS / NOT DEPLOYED

Production still reports8518db6 (rewrite-only gateway); quote and continuous-cycle
RPCs now exist in DB but deployed gateway does not route them. Current Codex branch
reuses the existing quote/cycle implementation and adds previousPaidRunId to bounded
E2E scope. Both quote and submit reject mismatched predecessor/parent; fixed subject,
exam and server idempotency key remain. Continuous execution defaultsOFF.

Changed: functions/api/essay/exam.ts and server/exam-endpoint.test.ts.
26 related test files/133 PASS; stored real-results adapter1 PASS; ESLint/TypeScript/
Node22 production build135 pages PASS. No UI/Payment/Math changes.
Pages flagfalse, continuousunset, Workerflagfalse verified via Cloudflare metadata.
Do not deploy the full branch over newer unrelated live changes. Review only gateway
delta against deployed8518db6, then obtain Owner approval for promotion and one scoped
additional-paid test. DB read-only quote returns1; accountbalance10/reserved0.
No Provider/Credit/DB/config/deployment action. Rollback old gateway and flagsOFF,
never delete runs/checkpoints/Ledger. Full contract/evidence and IAP conflict list:
APP wiki/essay-lab-ui-ux-v1.md Oct16 launch preflight. Public HOLD.

### Oct16 Owner-approved gateway-only promotion
Pages3b99d254-692b-405d-bdf4-574e75178ab3 SUCCESS: actual live source8518db6 +
functions/api/essay/exam.ts from14e7612 only. UI/Math/Payment unchanged.
Gateway SHA256 d0640668a83904f966d98dd1da584734c09cad0fe4f12c7b72d3dba83a9020ab.
Pages/Worker/continuous OFF; public503 held. Owner login helper pending; no new run,
Provider or Credit. Approved one-run E2E resumes after actual account login.
Rollback deployment45c3935b-c8c8-4fd4-94fc-5c1e31bb51a8; retain DB/history.

### Oct16 authenticated transport stop before submission (14:36–14:39 KST)

Owner login succeeded. Scoped activation deployment46122cd1 was verified for the
approved subject/exam/predecessor/request key only. The terminal Python request
stopped at quote with HTTP403; no submit intent was created and the fixed request
key has no run in Production. Unauthenticated reproduction identified Cloudflare
error1010 for urllib, while curl reaches the gateway normally. Terminal transport
now uses curl with credentials supplied through stdin only (not argv/files/logs);
syntax and expected OFF503 response verified. No application/auth policy changed.

Worker OFF and Pages runtime/continuous OFF restored; deployment
5869f421-93d0-460f-a341-2aa7f1796258 SUCCESS. All36 unrelated Pages bindings and10
unrelated Worker bindings preserved. Provider calls0, Credit reservations/charges0.
Readiness marker removed; request key unchanged. Owner terminal re-login is needed
because credentials were memory-only and the first script exited. Existing E2E
approval remains valid; do not request approval again or create a second request.
Public HOLD. This is a transport interruption, not a completed paid E2E.

### Oct16 additional-paid operating E2E — completed, public HOLD

Owner-approved review account/Hanyang2024 humanities afternoon2/question1/Package17,
request a4d46895-ed93-4c67-a685-902b6d5368d7: run
346083f3-1e9c-4cbb-8cf2-cdf7d25bfef9 completed 2026-10-16 14:48:27 KST.
Previous paid run5b636cda-9915-42e1-b209-9934c7c0fcb1, submission_index3,
parent_idNULL (new paid cycle), identical existing1174-character revised answer.
Registry234 and both Oct14 completed runs preserved. No DB schema/RLS changes.

- Actual Provider evaluation1 + independent review1; signed review checks all pass.
  Evaluation12968 input/1734 output; reviewer12229 input/3823 output tokens.
  Total30754 tokens. Cost/currency fieldsNULL: actual USD charge NOT_VERIFIED;
  do not report estimate as measured cost. No extra Provider retry/free evaluation.
- Billing settled1: reserve(+1 reserved), consume(-1 balance/-1 reserved), exactly
  one consume. credit_summary spendable9/reserved0 (before10/0).
- Owner-authenticated History RPC HTTP200 contains completed result, index3,
  previous_paid_run_id and free_rewrite_available=true.
- Next same-set free quote included0; window ends Oct30 14:48:27 KST.
  Old paid predecessor quote rejects PAID_CYCLE_ALREADY_STARTED. These checks
  are read-only; no fourth submission or duplicate paid submission was executed.
- Live WEB History/result and balance9 verified. Summary starts
  “논제의 세 요구를 모두 충실히 수행한 강한 답안이다.” Five criteria all4/5,
  matching the prior revised answer levels; no invented sentence feedback/examples.
- Operating WEB remains old8518db6 UI, so it labels this paid-cycle result as
  “최초 평가” and lacks the approved additional-cycle controls. Gateway-only
  deployment did not promote UI. This is an outstanding launch display GAP.
  APP device readback of this new result requested; not yet confirmed.
- The first/free-only QA harness cannot be reused as an additional-cycle comparison:
  parent_id is intentionallyNULL. It rejected that mismatched fixture before
  rendering. Separate stored additional-result QA now checks server index3,
  paid predecessor/free entitlement and actual output without inventing lineage.
  APP Native360px/200% test1 PASS; WEB stored-result render1 PASS. These are
  actual-result local render checks, not APP device acceptance.

Two pre-submit interruptions caused no Provider/Credit operation: urllib403/error1010
corrected by curl stdin transport; INVALID_ANSWERS caused by stored rubric/evidence
metadata corrected by projecting questionId/body/revision only. Body unchanged.
The rejected local intent is preserved separately; the successful intent remains
exclusive. No second run was created for the fixed key.

Enabled deployment288f82e3; after completion WorkerOFF and Pages runtime/continuous
OFF restored, deployment433141d6-b33b-4473-993c-7069697f3b75 SUCCESS. All other
36 Pages bindings/10 Worker bindings preserved. Public endpoint503 hold checked.
No Math/Payment/IAP/Claude branch change. Production UI promotion, APP device result
acceptance, measured API cost and final quality/public-release approval remain open.

Final checks: additional QA Flutter Analyze clean; WEB ESLint/Typecheck PASS;
public503 verified; Registry234/prior completed2/fixed-key runs1 confirmed.
No application runtime source changed this turn; QA and Wiki only. Prior iOS/WEB
build evidence remains applicable; no redundant rebuild for documentation/tests.

### Oct16 Owner device confirmation — additional paid result

Owner confirmed the requested APP check: review@legendstudy.com, Hanyang result
completed14:48, balance9, summary “논제의 세 요구를 모두 충실히 수행한 강한 답안이다.”
match WEB. Additional paid result/History readback and Credit balance parity PASS
by Owner device evidence. This supersedes the pending APP device check above.
No new submission, Provider call, Credit transaction, deployment or DB change.
Operating WEB additional-as-initial label GAP, measured USD cost and final release
approval remain open. All execution flags remain OFF; general public HOLD.
