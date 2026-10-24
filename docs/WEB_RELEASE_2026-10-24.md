# WEB release — Owner P0, 2026-10-24

## Authority and baseline

Owner explicitly authorizes Codex to integrate and deploy WEB; APP work waits for Owner WEB acceptance, Store submission waits for final Owner approval. No new evaluation engine, profile development or paid Provider verification. This supersedes earlier PR-only approval holds, and earlier preparation-university positioning rules.

Actual Cloudflare canonical deployment rechecked: `e67a0d37-0d1f-4042-b480-7ffd7ba18b5b`, successful, source `f1a9e27a7d1e8d9882339398b4c0cbc86aa43616`. Pages production branch label is `main`, but the deployed source is the separate production-lineage commit. Do not deploy old Git main.

PR #5 `2587491` supplies selective admin PR #2 and MY PR #3 integration. This release selectively adds PR #4 result section/card/evidence/growth styling while preserving newer production human-report rendering, quoted-answer guard, report provenance, History grouping and refresh. Original PR #4 preview pages do not replace the real current selectors.

## Changes

- Remove the full generated-answer example section. University official-answer section was removed in PR #5. Internal report/source data remains intact.
- Remove problem-pane width control; preserve responsive layout and all browser/account draft keys and conflict handling.
- Move collapsed 2027 schedule above question selection, immediately below official-source header.
- University start actions use a new read-only WEB projection of the existing public-exam configuration AND Worker admission, plus existing Math availability. Canonical university IDs are joined from authenticated RLS reads. Unknown, unauthenticated, failed or unjoined status never enables a start action. University names remain links for material/PDF browsing. Ready universities sort first. No hardcoded active university/question count.
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

Preview `2a09bfef` deployed successfully: https://2a09bfef.legendstudy-lab.pages.dev . Actual browser confirms university cards, source link, collapsed schedule above selector, and fail-closed start buttons. Full signed-in verification is blocked: `getBrowserAuthConfig` explicitly forbids the Production Supabase project on Pages preview origins; Preview also lacks the essay gateway bindings. Existing security boundary was preserved, not bypassed. Owner asked to choose an approved connected Preview or explicitly amend the pre-deployment gate. Production not changed pending that answer.
