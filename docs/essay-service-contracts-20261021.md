# Local essay service contract integration — 2026-10-21

Production unchanged. No Provider/real Credit calls. Claude UX and all registered data
preserved. Canonical SQL lives in APP `codex/essay-service-contracts-20261021`, migrations
`20261021071701_essay_browse_metadata` and `20261021071702_essay_confirmed_math_input`.

- Existing selector uses metadata-only `essay_browse_catalog(p_university)` for ordinary
  users/guests. Published DB rows retain their draft/submission path; newly browsable
  rows show review pending and cannot mount a submission consumer. No private source
  or evaluation data is copied into selectors. Legacy operator RPC fallback only for
  missing-function errors during staged rollout; other errors fail closed.
- Exam endpoint accepts text OR exact `{questionId,revision,mathInput:{attemptId,
  confirmedRunId}}`. Raw image URLs, client transcription override and unknown fields
  remain rejected. Shared DB resolver performs ownership/canonical mapping/readiness
  checks before the existing journal/reservation path. Browser never grants authority.
- Submit consumer accepts `confirmedMathInput` from existing Math confirmation flow.
  The optional typed reference is an integration boundary; this patch does not wire
  unreviewed SourceExamWriter photos to Math nor manufacture question→leaf mappings.
  Mapping records, content/model approval and end-to-end input handoff remain required
  before any live activation. Existing Math upload/retry/confirmation UI stays intact.
- DB-only Math input snapshot now preserves ordered confirmed body and provenance,
  avoiding re-reading mutable current OCR during replay. Existing Worker reads frozen
  `answer.body`; no evaluator changes, no new Storage, no Credit price changes.

Validation: isolated actual PG17 integration 19 checks PASS (canonical Math + journal,
synthetic package/model fixtures), related WEB/runtime/Math unit tests and selector
regressions. No live Provider E2E or authenticated Production browser re-attestation.
Apply migrations and deploy only after separate Owner approval. Canonical APP handoff
contains preflight/guarded rollback; never apply APP's unrelated historical migrations.

Final checks: Typecheck/Lint/Build/Boundary PASS. Related36files235tests PASS;
isolated PG17 19checks PASS. First sandbox build stalled; same build outside sandbox
completed successfully (135 static pages). No deployment. APP contract commit8110492.
