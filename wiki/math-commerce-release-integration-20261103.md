# Math/commerce release integration — WEB candidate

This is a WEB implementation pointer. The canonical report and policy source is APP `wiki/app-math-commerce-integration-report-20261103.md`.

## Integration and preservation

Production deployment source `c9bda913` is the ancestor of this release branch. Reused 23 commits from the preserved TEST branch through `8939034`, rather than replacing the production tree. Resolved Wiki log, dependency lock and terminology conflicts by retaining production GA4/jose, payment/admin changes and Math/katex. Existing production payment, school-resolution service, notice editor, GA4 service and legal sources have no integration changes.

## Bounded admission

`src/data/essay-beta-expansion.json` initially pinned 16 exams. The 2026-11-04 Owner expansion now pins 42 complete existing exams / 110 questions across six universities: Inha natural 15, Chung-Ang commerce 10, Hanyang commerce 8, Konkuk mixed 6, Kyung Hee social mixed 2, and Sogang economics Essay 1. There are 71 canonical Math leaves; the one existing legacy Konkuk leaf is preserved separately. Hanyang 2024 natural TEST-only records are not copied into production. Medical nine exams and incomplete newly proposed exams remain outside this expansion.

Forty-one Math/mixed expansion exams already belong to the existing 211-ID public policy allowlist. Sogang 2026 economics is the single proposed addition, making 212 public IDs while preserving all prior IDs. New `ESSAY_BETA_EXPANSION_EXAMS` only unlocks explicitly listed manifest exams on the exact production origin/project after live canonical Math mapping and whole-question validation. Missing/malformed/foreign flags fail closed. Existing humanities discovery/Essay admission remains intact. Natural exams route to existing Math session submission; commerce routes to the existing Essay parent with a Math child. No new engine, exam database or evaluator is introduced.

Production read-only evidence supplied by the release lead confirmed existing runtime package calls for all 16 exams, pinned package digests, official problem/criteria/intent roles, and existing `runtimeApproval.APPROVED`. Review labels remain unchanged: do not relabel `NEEDS_REVIEW` as quality PASS. OCR/feedback quality remains distinct from these integration checks.

## Shared credit consent

Math uses existing `essay_beta_daily_claim_v2` only before an explicit initial/next-paid quote, never on browsing, OCR or known free rewrite. Existing `essay-credit-source-v1` parser and Essay credit consent UI are shared. New incremental RPC wrappers `math_session_quote_source` and `math_session_continue_source` pin the displayed grant; `CHARGE_SOURCE_CHANGED` and `CHARGE_CHANGED` require a fresh quote and consent, including expiry or concurrent use of a free rewrite. Ambiguous responses keep the same idempotency key and grant without reclaiming or blindly reserving another credit. The existing one-free-rewrite/14-day/beta-cutoff policy is retained.

The SQL candidate is not implied deployed by these client files. Until the corresponding SQL and bindings are verified, new paths remain unavailable.

## Verification

- Full Vitest: 233 files PASS, 3 SKIP; 1,705 tests PASS, 4 SKIP.
- Paid/free/source-change/claim-failure/lost-response Math and Essay tests: 27 PASS.
- ESLint: 0 errors, 2 existing hook dependency warnings in the affected Math component; optimized Next build including TypeScript PASS.
- Cloudflare Pages Functions local compilation PASS.
- Boundary checker PASS; two pre-existing `.delete` false positives were narrowed to known URLSearchParams/Map local methods, without changing admin behavior or bypassing database writes.
- The generic Git readiness scanner reports three reviewed false positives: an ephemeral test key variable in `cloudflare/ga4-reporting.test.ts`, a PostgreSQL ACL `service_role` entry in the existing scope candidate SQL, and this explanation in the Wiki. It is a scanner limitation, not a successful scanner run. Targeted source/bundle checks found no private-key material, secret-valued key prefix or signed JWT; the browser contains only the Supabase library check for the literal public/secret key prefix.
- No new actual Provider/E2E call or deployment in this step; previous TEST E2E evidence remains in canonical TASK16 reports.

## Artifacts and next operations

Production browser config was loaded from verified public Cloudflare `NEXT_PUBLIC_*` settings, with production Supabase origin and Google/Kakao/Apple providers checked without logging values. `out/` is the production-configured static build; Cloudflare local bundle is `/tmp/legendstudy-web-release57-functions/`. Distribution archive/checksums are prepared under `/tmp/legendstudy-web-release57-production/`; source Git SHA is recorded in its manifest.

Do not deploy that browser build to isolated TEST: build again with exact TEST public auth configuration. Production change order is canonical DB preflight/transaction/verification, matched explicit server bindings, then matching WEB distribution. Do not rewrite Secret bindings from masked dashboard/API values. Keep existing humanities public scope, provider secrets, financial history and all accepted requests. Store submission remains separate.

## 2026-11-04 SQL candidate and isolated verification receipt

[Versioned package](../supabase/candidates/release57_math_commerce_20261103/README.md) contains the three ordered production candidates, exact postflight and safe HOLD rollback. These production transactions remain unapplied. The distinct TEST-only upgrade passed independent review and was applied only to `kpqbedylxlyntrrfybpn`; six function definitions/ACL/config match and ten existing data counts remained unchanged. Actual HTTP source checks are PARTIAL: existing free rewrite0 and anonymous rejection PASS; initial paid source has no available TEST balance. No grant was created and no Provider called. The APP update-policy candidate is separate, initially disabled, and requires Owner approval before any remote migration.

## 2026-11-04 broader existing Registry connection

The read-only production inventory and successful `essay_material_runtime_package` reads supplied the exact existing exam/question IDs, package digests and routing. The prepared DB target is the existing 160 complete beta exams plus 42 additions = 202 complete nonmedical exams. Public visibility is a separate contract: preserve 211 existing IDs, including prior partial policy, and add only Sogang 2026 economics. Sookmyung 2025 has only one approved question out of four and is excluded; the existing Korea partial exception is preserved without upgrading it to whole-exam completion. Review states, source content and Engine policies are not edited.

The WEB candidate now avoids requiring Math availability for a verified Essay-only social/commerce exam. Mixed and natural candidates still require every exact Math leaf and whole-question mapping. Existing humanities use their unchanged preflight; unavailable or changed official evidence remains fail-closed. No new evaluator or database is introduced.

Fresh Cloudflare read-only evidence: production still `aaf80a93-c43f-4de0-afde-69d8f7ecb67e`, source `c9bda913cb26784fb8e3755a5fbc48cc446ab266`. Math runtime/Provider calls and mixed sessions are enabled, but continuous cycles are false and no expansion binding exists. Provider/Worker secret presence was checked without reading or replaying secret values. This candidate has not been deployed.

Prepared plaintext changes, after matching DB preflight/postflight: `ESSAY_PUBLIC_EXAMS` 212 IDs, `ESSAY_BETA_EXPANSION_EXAMS` 42 IDs, `MATH_PUBLIC_LEAVES` 72 IDs (71 nonmedical + legacy Konkuk), continuous cycles true. All bindings fit the existing bounded parser and 5,000-character hosting limit; no chunking or wildcard is needed. Keep the existing two-subject operator scope and Provider/Auth/payment configuration. The current 99 Math leaf binding includes 27 medical leaves; omitting those from this activation list preserves the separate medical hold without deleting data.

APP58 asks `math_catalog(p_limit:50)` and its submit router depends on the returned full mapping. The expanded DB candidate must supply the approved bounded complete catalog for that existing call. WEB cannot fix APP58 truncation by widening an environment flag alone.

Validation: all 1,707 WEB tests PASS / four existing SKIP (234 files PASS / three SKIP), TypeScript, changed-file ESLint, Next production build, local Cloudflare Functions compilation, boundary checks and diff whitespace PASS; exact manifest-to-current-inventory comparison PASS for all 42 candidates. These are local contract/regression checks, not a claim of production submission or Provider E2E. Deployment is coordinated by the root integration task after current function/ACL/data snapshots, SQL postflight, exact scope checks and immutable rollback preparation. Restore previous deployment/plaintext flags and apply HOLD-only scope rollback if necessary; never erase accepted submissions, Ledger or History.

Staged deployment: after proving no pending Math jobs, deploy this artifact first with `MATH_ENABLED=false` and no expansion binding, preserving current Essay public scope. Apply and verify the guarded DB increments, update the exact Worker/public scopes, then set the final plaintext bindings and redeploy the same artifact with Math enabled. Project-setting changes are not treated as evidence that a currently running deployment changed. Use the [Cloudflare project PATCH contract](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/edit/) with only changed plaintext keys; an absent-before expansion key is restored with `null`. Never replay masked secrets, whole settings, Preview settings or service bindings. Before DB changes the previous deployment can be restored; after the core Math contract changes, retain the compatible new code under Math HOLD instead of blindly restoring the old API bundle.

Artifact routing review found that the prior GA4 production deployment script appended two API routes and private admin/review headers outside the checked-in public assets. These exact existing settings are now tracked in `public/_routes.json` and `public/_headers`, with two regression checks, so a full deployment preserves GA4 and Owner-review APIs. The unrelated compiled materials-analysis API is not newly exposed. The actual prior production script is the `ga4-reporting-20261102/deploy.mjs` backup; this is preservation of deployed behavior, not a new admin feature.

## Actual staged HOLD and whole mixed-exam guard

The earlier “not deployed” sections describe candidate preparation. On 2026-11-04 the explicitly approved production HOLD stage was applied: Pages `d8b0d2de-72aa-4ba0-ac76-a9a8fc2ddb84`, source `172c5e1`, immutable artifact SHA256 `2b74b927c3a2fbf10217c4457660b0052190c0c1128d225b57cfbe3f6f8dd441`. A fresh canonical-deployment guard preceded a key-only `MATH_ENABLED=false` PATCH. Every other plaintext hash, binding name/type, service binding and Preview setting matched; the old scope211/Math99/cyclesfalse/no-expansion was retained. Deployment metadata and anonymous home200, Math availability false, public-status401, admin401, Owner-review GET401 were checked. Secret values were neither copied nor logged. This stage made no Provider call or DB mutation.

The coordinating release lead subsequently applied and verified the core/scope/beta transactions; final activation waits for the fourth narrow mixed guard and revised WEB artifact. Its server errors are `MIXED_COMPLETE_ANSWERS_REQUIRED` and `MIXED_RELEASE_SCOPE_CHANGED`. Exact active expanded mixed admissions return `requireCompleteQuestionSet:true`; the existing WEB submit UI lists missing questions and prevents daily-free claim, quote and submit until every answer is included. Quote validates the full unique approved question-ID set. Submit still reaches the existing atomic DB RPC so accepted idempotent replays and historical records are preserved. Confirmed guard rejections show actionable Korean messages and clear only rejected pending-request identity, retaining saved answers. Existing plain humanities subset submission is unchanged.

The request heading now distinguishes selected questions from all questions. Stored results already distinguish `전체 N문항 중 M문항 첨삭 완료`; this behavior is retained and regression-tested. No partial result is relabeled as a completed whole exam. The new restrictions are driven by exact server admission, not client metadata or a blanket commerce category.

Relevant API/UI/humanities/history tests:74 PASS, including all26 new mixed exam quote subsets/duplicates, full-set quote, DB rejection mapping, accepted replay, no premature daily claim, existing humanities selection and preserved partial History. These are contract tests; real production Provider E2E remains separately recorded by the release lead.

Final full WEB regression after the mixed guard:1,718 PASS / four existing SKIP,235 files PASS / three SKIP. TypeScript and changed-file lint PASS. The production-configured build and immutable distribution are verified after this source commit and reported in the deployment receipt.
