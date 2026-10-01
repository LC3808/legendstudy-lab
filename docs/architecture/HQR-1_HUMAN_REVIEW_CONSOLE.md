# HQR-1 — Human Review Console v1 (LAB implementation)

**Status:** IMPLEMENTED / LOCAL_VERIFIED. Production operator write = NOT_ASSESSABLE.
**Date:** 2026-10-01
**Branch:** `claude/quality-console-v0`
**Scope:** Extends the read-only Quality Console (`/ql`) with the Human Quality review
workflow, consuming the deployed canonical HQP contract. No backend change.

## 1. Canonical backend dependency

Consumes the Production-applied migration `20261001000200_human_quality_persistence`
(APP `codex/essay-scaffolding-vnext`) via the authenticated browser Supabase session —
RPCs `ql_submit_human_judgment`, `ql_review_state`, `ql_list_human_judgments`. `ql-read-v1`
(`is_quality_operator`, `ql_list_cases`, `ql_case_detail`) is unchanged and still used for
reads. Exact contract mapping: [HQR-1_HUMAN_REVIEW_CONTRACT_MAPPING.md](HQR-1_HUMAN_REVIEW_CONTRACT_MAPPING.md).
`BACKEND_CHANGE_REQUIRED: NO`.

## 2. UI architecture (additive)

`/ql` remains a client route on the static export. New adapter modules live beside the
existing `ql-read-v1` adapter and never do direct table access:

- `src/lib/quality/human-review-contract.ts` — `hq-read-v1` / `hq-write-v1` types, enums
  (copied from the migration), and response parsers (fail-closed on dto mismatch).
- `src/lib/quality/human-review-errors.ts` — HQP error taxonomy + Postgres-code mapper.
- `src/lib/quality/human-review-client.ts` — `getReviewState` / `listJudgments` /
  `submitJudgment` over the session; session-gated; batch ≤ 100; paired cursor.
- `src/lib/quality/human-review-view.ts` — KO labels, conditional applicability, finding
  target extraction from the loaded detail, payload builder, lightweight validation.
- Components: `quality-review-panel.tsx` (history + submit orchestration + idempotency),
  `quality-review-history.tsx`, `quality-review-form.tsx`; `quality-case-list.tsx` gains a
  review-state badge; `quality-console.tsx` batch-fetches review-state and renders the panel.

## 3. Review-state workflow

List badges come from `ql_review_state` (canonical projection — never inferred from
`ql-read-v1`): `UNREVIEWED / REVIEWED_ACCEPTABLE / REVIEWED_WITH_CONCERNS / REVIEWED_FAILED /
MULTIPLE_REVIEWS / DISAGREEMENT`, plus a material-issue marker. The console fetches state in
**one batch per visible page** (deduped, ≤ 100) — no per-row history calls, no N+1. A
review-state failure is swallowed (badges absent) and never corrupts the `ql-read-v1` list.
The "미검토만" filter and "다음 미검토" traversal operate over the **loaded** cases only and
are labeled as such (no fake global completeness).

## 4. Form / rubric / findings

`hq-rubric-v1`: 6 required dimensions (`OK/CONCERN/FAIL`) + 3 conditional
(`+NA`). Conditional dimensions are pre-locked to `NA` from the loaded detail when the
artifact is absent, else require a real verdict; the server remains authority and the UI
surfaces `invalid conditional NA`. Disposition consistency (PASS → all OK/NA + no findings;
PASS_WITH_NOTES → no FAIL + only MINOR findings; blocking FAIL blocks PASS) is mirrored as
lightweight UX; the server validator is authoritative. Findings use only canonical categories,
severities, and the seven typed targets; **target refs are selected from the loaded
`ql_case_detail`** (dimension_id / progress_id / issue_key / sentence progress_id+observation_key
/ evidence link / overall / generated rewrite) — no typed UUIDs, no invented sentence id, no
cross-evaluation target. Internal note is optional, operator-only, length-capped, with guidance
against PII / secrets / answer copies / chain-of-thought. Overall disposition uses Korean labels
(적합 / 적합 · 참고사항 / 재검토 필요 / 부적합) over the exact canonical values.

## 5. Correction / history / disagreement

History (`ql_list_human_judgments`) shows independent and superseded judgments, reviewer
state (`삭제된 리뷰어` for removed accounts — never an id/email/alias), time, rubric version,
verdicts, findings, note, and the correction relation — never only the latest. "이 검토 정정"
starts a correction = a **new** judgment with `supersedes_judgment_id`; the original is never
edited. Independent reviews do not auto-supersede. Disagreement/multiple-review states render
from the canonical projection — no client scoring/averaging; `NOT_COMPARABLE` honored.

## 6. Idempotency UX

One `client_submission_id` per submission attempt; the same unchanged draft reuses it (so a
network-ambiguous retry is deduped by the server), while a changed draft rotates it. An
ambiguous failure never auto-retries and never silently rotates the key. A same-key/
different-payload conflict (`23505`) and a stale correction head (`23514`) surface clear
operator errors. FAIL is record-only — the UI performs no invalidate / re-evaluate / refund /
progress / answer / publish action.

## 7. Security boundary

Authenticated browser RPC only; no `service_role`, no server secret, no direct
`human_quality_*` / Essay table access; reviewer identity server-derived from `auth.uid()`;
no payload / JWT / answer logging; operator gate precedes the review UI (DB authorization is
authoritative; hidden controls are not security).

## 8. Tests

160 tests pass (45 new). Adapter/view/client: `human-review-contract.test.ts`,
`human-review-view.test.ts`, `human-review-client.test.ts`. UI: `quality-review.test.tsx`
(history incl. deleted/superseded, canonical dimensions/dispositions, validation gating,
finding target source, submit + refresh, double-submit guard, idempotency key reuse/rotation,
conflict error, correction supersession) and `quality-console-review.test.tsx` (batch
review-state after operator gate, no N+1, badges, 미검토 filter). Existing LEC regression green.
lint / typecheck / boundary audit / static-export build PASS; `/ql` emitted `noindex`,
`_routes.json` scope unchanged.

## 9. Production limitation

No legitimate Production evaluation case exists, so a **real** operator write is
`NOT_ASSESSABLE`. Successful submit is verified only with synthetic fixtures + mocked RPCs;
HQR-1 created no Production HQP row, fixture, or evaluation. `OPERATOR_WRITE_SUCCESS
(Production)` stays `NOT_ASSESSABLE`; `HUMAN_REVIEW_WRITE_UI = IMPLEMENTED / LOCAL_VERIFIED`.

## 10. Next gate

Separately authorized: LAB deployment / operator availability → first legitimate evaluation
→ first Production Human Review write E2E → account-deletion 14-day lifecycle → privacy/
analytics retention design → Production AI/model gate → real-student Pilot decision.
