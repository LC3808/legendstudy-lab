# MATH-7B — Math Human Quality / Quality Console Implementation (status)

**Status:** IMPLEMENTATION (operator consumer over MATH-2E `qlm_quality`). No live provider, no
Production, no DB write, no payment, no real student data. **Human Quality reviews the AI evaluation's
quality — never a student re-grade** (HQ PASS ≠ student correct; HQ FAIL ≠ student wrong). MATH-4
remains the sole mathematical-evaluation authority.
**Date:** 2026-10-03
**Repository:** `LC3808/legendstudy-lab` · branch `claude/math-vision-input-3b`.
**Semantic authority:** [MATH-7A](MATH-7_HUMAN_QUALITY_CONSOLE_CONTRACT.md).
**Runtime authority (read-only, verified):** APP `17e528b`, MATH-2D `20261002000200`
(SHA `b40bf72…`); RPC `qlm_quality` (`qlm-runtime-v1`). `ql-read-v1` / `hq-read-v1` (Humanities) and
`src/lib/quality/*` are **untouched**.

## Runtime actions bound (exact qlm_quality surface)
`list` · `detail` · `submit_judgment(judgment)` · `review_state(evaluation_ids≤100)` · `history`.
Judgment payload is exact `hq-math-write-v1`: `dto_version, math_evaluation_id, expected_output_sha256,
client_submission_id, rubric_version=hq-math-rubric-v1, overall_disposition, rubric_result, findings,
reference_context_reviewed` (+ optional selection_reason / recommended_action / summary_note /
supersedes_judgment_id). Reviewer identity is server-derived.

## What was implemented (`src/lib/math-quality/`, client-safe; `src/components/math-quality/`)
| module | role |
| --- | --- |
| `types.ts` | hq-math-rubric-v1 (11 dims, OK/CONCERN/FAIL/NA), disposition (PASS/PASS_WITH_NOTES/NEEDS_REVIEW/FAIL), finding categories, severity (MINOR/MATERIAL/CRITICAL), **typed Math targets** (OVERALL/SOLUTION_STEP/ROOT_ERROR/EXTRACTION_REGION/ALTERNATIVE_PATH), judgment write DTO, case detail, review-state |
| `write-validation.ts` | fail-closed: rubric version, all 11 dims, **conditional NA** (artifact-absent ⇔ NA), disposition↔verdict/finding consistency, **finding-target binding to canonical ids**, **output-hash binding** |
| `review-state.ts` | derive UNREVIEWED/SINGLE/MULTIPLE/CORRECTED/DISAGREEMENT/NOT_COMPARABLE from append-only heads; **disagreement preserved, never averaged**; no numeric consensus |
| `runtime/contract.ts` + `quality-client.ts` | `qlm-runtime-v1` client (operator-gated server-side; browser-safe) |
| `runtime/mock-quality-server.ts` | deterministic qlm_quality mock: operator gate, hash binding, append-only correction, idempotency, independent reviews, disagreement, **E1 CASCADE / E2 reviewer SET NULL** |
| `components/math-quality/math-quality-review.tsx` | minimal Math reviewer workspace — Math-typed evidence + review state + explicit "reviews the AI, not the student" banner; **not** the sentence-centric Humanities UI |

## Contract fidelity (Q01–Q30 + contract checks, test-enforced)
- HQ rubric OK/CONCERN/FAIL/NA (distinct from the student diagnostic scale); conditional NA enforced;
  **required-present evidence cannot be falsely NA'd** (Q25 → UNASSESSABLE path, not NA/PASS).
- Typed Math finding targets bound to canonical ids (SOLUTION_STEP/ROOT_ERROR/EXTRACTION_REGION/
  ALTERNATIVE_PATH[STUDENT|REFERENCE]); unbound target rejected.
- **Output-hash binding**: stale `expected_output_sha256` rejected.
- Disposition consistency (PASS ⇒ clean + no findings; PASS_WITH_NOTES ⇒ no FAIL + MINOR-only).
- Append-only correction (supersedes exact active parent → CORRECTED); independent reviews coexist;
  **DISAGREEMENT preserved**. Idempotent submit (same key replays; changed payload conflicts).
- **E1**: evaluation deletion removes the bound Math HQ graph. **E2**: deleted reviewer → null
  ("삭제된 검토자"). Operator gate denies non-operators even with a valid payload (idempotency ≠ bypass).
- Review coverage: extraction / root-propagation / alternative-path / CORE / hint / reevaluation /
  generated-solution quality all representable (Q04/Q07/Q10/Q13/Q15–17/Q18–20/Q22).
- **HQ PASS ≠ student correct / HQ FAIL ≠ student wrong** (Q02/Q03 assert HQ independent of
  `student_answer_status`).

## Shared shell / Humanities compatibility
The Math workspace is a new domain workspace (`src/lib/math-quality/*`, `src/components/math-quality/*`)
reusing the operator-gate + review-state + submit/correction patterns, **without** forcing Math into
the Humanities sentence-centric UI. Humanities `ql-read-v1`/`hq-read-v1` consumers and `src/lib/
quality/*` are unchanged.

## Not in scope / remaining gates
No live provider, no Production, no payment, no Quality Console route wiring into public nav. R21
Storage, gateway/worker deployment, ADR-2 erasure, controlled real-model bake-off, Production apply,
real pilot remain open. `loading.tsx` unchanged.

## Next
OWNER/CHATGPT REVIEW → controlled model bake-off → R21 / ADR-2 / runtime activation gates.
