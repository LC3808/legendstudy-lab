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
