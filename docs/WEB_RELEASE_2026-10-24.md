# WEB release — Owner P0, 2026-10-24

## Authority and baseline

Owner explicitly authorizes Codex to integrate and deploy WEB; APP work waits for Owner WEB acceptance, Store submission waits for final Owner approval. No new evaluation engine, profile development or paid Provider verification. This supersedes earlier PR-only approval holds, and earlier preparation-university positioning rules.

Actual Cloudflare canonical deployment rechecked: `e67a0d37-0d1f-4042-b480-7ffd7ba18b5b`, successful, source `f1a9e27a7d1e8d9882339398b4c0cbc86aa43616`. Pages production branch label is `main`, but the deployed source is the separate production-lineage commit. Do not deploy old Git main.

PR #5 `2587491` supplies selective admin PR #2 and MY PR #3 integration. This release selectively adds PR #4 result section/card/evidence/growth styling while preserving newer production human-report rendering, quoted-answer guard, report provenance, History grouping and refresh. Original PR #4 preview pages do not replace the real current selectors.

## Changes

- Remove the full generated-answer example section. University official-answer section was removed in PR #5. Internal report/source data remains intact.
- Remove problem-pane width control; preserve responsive layout and all browser/account draft keys and conflict handling.
- Move collapsed 2027 schedule above question selection, immediately below official-source header.
- University start actions use a new read-only WEB projection of the existing public-exam configuration AND Worker admission, plus existing Math availability. Canonical university IDs and exact question identities are joined through the existing public `essay_browse_catalog` RPC. Direct table RLS intentionally hides unpublished registered exams. Catalog reads use bounded browser concurrency; the Pages admission request does not fan out into 42 additional metadata reads. Unknown, unauthenticated, failed or unjoined status never enables a start action. University names remain links for material/PDF browsing. Ready universities sort first. No hardcoded active university/question count.
- New endpoint never calls submission, quote, evaluation, reserve, purchase, or ledger writes. Existing per-question submission policy remains authoritative.

## Seven preservation answers

1. No new historical fact collection; display existing submissions, timestamps and judgments.
2. Existing immutable answers/results and provenance remain the reconstruction source.
3. No DB UPDATE, rewrite, deletion or migration; browser draft keys unchanged.
4. Existing Auth identity and owner guards remain; readiness cache resets by account.
5. Learning results remain separate from admissions decisions/outcomes; no new inferred facts.
6. Existing RLS/permissions and private no-store responses; no answer bodies or identities in public metadata.
7. Readiness and growth are derived views only; no derived values are persisted as raw facts.

## Validation and remaining gates

Node 22 + frozen pnpm lock installation succeeds; no dependency/lock changes. Typecheck PASS. ESLint pre-existing two test `any` errors corrected with explicit types, refresh warning corrected without changing refresh triggers. Related admin/MY/materials/selector/status tests: 116 PASS, 2 skipped. Boundary PASS. Production build PASS (135 static pages), with the existing six public build variables loaded in memory from Production configuration; no secret copied or modified.

Full-suite baseline has six failed assertions and one empty suite in catalog research/projection/public-discovery fixtures. Prior PR #5 reproduced these on pristine f1a9e27. Schedule-order assertion updated for this explicit Owner change. Final full suite: 1,213 PASS, 6 pre-existing failed assertions, 4 skipped; the pre-existing empty test file also fails suite collection. No new failing assertion. Baseline failures are not called PASS.

Cloudflare Preview has only three existing bindings and lacks the production essay execution bindings. Preview authenticated backend parity must be verified before declaring its full acceptance. No secret provisioning, masked-secret resend, DB/Worker/Ledger change is authorized.

## Rollback / follow-up

Preserve canonical deployment `e67a0d37-0d1f-4042-b480-7ffd7ba18b5b`. On common failure use Pages rollback to that exact deployment, then verify login/History/Credit and canonical ID. Do not choose older `40c5085a` by default because it predates the pending-question-set correction.

APP unchanged; no Android/iOS build, device purchase, Provider evaluation or store submission in this WEB phase. Owner reports prior Android/iOS purchases successful; preserve those implementations and inspect only missing APP integration after WEB acceptance.

## Preview verification

Preview `2a09bfef` deployed successfully: https://2a09bfef.legendstudy-lab.pages.dev . Actual browser confirms university cards, source link, collapsed schedule above selector, and fail-closed start buttons. Full signed-in verification is blocked: `getBrowserAuthConfig` explicitly forbids the Production Supabase project on Pages preview origins; Preview also lacks the essay gateway bindings. Existing security boundary was preserved, not bypassed. Owner asked to choose an approved connected Preview or explicitly amend the pre-deployment gate. Owner subsequently approved Preview visual/local verification followed by Production deployment. No Preview auth boundary or secrets were changed.

## Postflight rollback and correction

Owner approval: “Preview 화면·로컬 검증 후 Production 배포 허용”. Source `625a739` deployed as `5a572e76-a91c-4b4b-a36e-1cae74966809`. Signed-in History (9 visible rows), stored report, growth and Credit 107 rendered correctly, but all university start actions remained disabled. Immediately rolled back to `e67a0d37-0d1f-4042-b480-7ffd7ba18b5b`; Cloudflare canonical deployment verified.

Cause: direct `essay_exams` metadata RLS returned no rows for the registered unpublished exams. Correction uses the already-approved browse RPC and exact admitted question IDs, without table grants, SQL, Worker, Registry or Secret changes. Read-only live RPC verification resolves all 9 configured public exams to matching canonical university IDs (metadata presence alone is not readiness). Regression tests include inaccessible base tables, identity mismatch, question mismatch, metadata errors and unmount. Correction tests 24 PASS; typecheck, lint, boundary and production build (135 pages) PASS. Corrected deployment and postflight verification follow.

## Second postflight and MY integration correction

Corrected service-status source `76ca473` deployed successfully as `32461d27-cc36-429f-a0d6-d1cc1abec90c`. Actual signed-in UI now sorts Konkuk, Seoul Women's, Sungkyunkwan and Soongsil first with start actions; other universities remain browsable/preparing. SKKU 2026 language 1st-session selector, existing 1,476-character browser draft, PDF page 2/6, and request CTA verified without submission. Stored report, criterion evidence, unchanged growth (0 improved / 3 unchanged), rewrite entry and prior-answer controls verified.

MY growth card still used only the older summary RPC and falsely showed empty despite current exam History. It now reuses the same owner-scoped essay/exam/math reads and summary functions as History whenever current records exist. Legacy comparisons retain their original strict comparison gate. Read failures are not treated as empty data. Related admin/MY/status tests 221 PASS, 2 skipped; final build PASS.

Admin dashboard renders actual metrics. Its existing aggregate RPC reports zero essay evaluations despite current exam History; complete unified aggregate coverage is unresolved, so UI now labels the scope as the admin summary and explicitly marks current exam History integration unverified. Math and WEB payment flags are labeled as admin-query settings, not proof of actual Worker or Native payment availability. No new SQL/RPC/permission was introduced. Administrator quality labels also use 첨삭 instead of AI.

Browser session changed accounts during manual verification: earlier student showed Credit107 / History7 evaluated,5 rewritten,3 reevaluated; later administrator showed Credit95 / History10 evaluated,8 rewritten,5 reevaluated. These are separate accounts, not a balance delta. No purchase, new evaluation or credit mutation was performed.

## Final release — Owner WEB acceptance pending

Production canonical deployment verified successful: `6b69acb3-f497-48e4-8f79-559fc82a7b95`, source `a21642cf384adc69fa5c6ec6180c3ea7c4987cd2`. Final Preview: https://4a11baa7.legendstudy-lab.pages.dev . The later documentation-only commit does not change the deployed code.

Final signed-in checks: administrator dashboard and updated scope labels render; MY current-record counters match History (10 evaluated / 8 rewritten / 5 reevaluated for the administrator); Credit95 and 11 existing credit-history entries remain. Earlier student Credit107 and stored draft were separately verified. Existing stored report, evidence, unchanged-growth comparison, rewrite entry/previous-answer controls and PDF viewer render. No submission, Provider invocation, purchase, Ledger/DB write, Secret change or Worker deployment occurred.

### Public-scope question matrix (live UI; 2026-10-24)

Configuration contains 9 public exams, while their browse metadata contains 20 questions. Each question tab was checked against the existing live admission-driven CTA, without submitting. The configured scope must never be equated to all metadata questions being active.

| University / exam | Active question labels | Preparing question labels |
| --- | --- | --- |
| Konkuk 2026 admission humanities | 2 | 1 |
| Konkuk 2026 mock humanities | 1, 2 | — |
| Konkuk 2025 admission humanities I | 2 | 1 |
| Seoul Women's 2026 admission humanities/social | 1, 2 | — |
| Sungkyunkwan 2026 language session 1 | 1 | 2, 3 |
| Sungkyunkwan 2026 language session 2 | 1 | 2, 3 |
| Soongsil 2027 mock humanities | 1 | 2 |
| Soongsil 2026 admission humanities | 1 | 2 |
| Soongsil 2024 admission humanities | 1 | 2 |

Total observed active: 11 questions across 4 universities / 9 exams. Historical handoff said 12. This discrepancy is recorded as a runtime-policy GAP, not silently corrected by hardcoding or expanding admission. The UI follows the current per-question gate. No new quality/profile/Worker investigation or activation was performed.

APP edits, Android/iOS builds, device checks and Store updates remain NOT_STARTED in this release task, per the explicit Owner WEB acceptance prerequisite. Prior successful Android/iOS purchases remain Owner-reported PASS. Rollback remains exact deployment `e67a0d37-0d1f-4042-b480-7ffd7ba18b5b` (source f1a9e27). Admin aggregate coverage and the historical 12/current11 difference remain explicit limitations for Owner review.
