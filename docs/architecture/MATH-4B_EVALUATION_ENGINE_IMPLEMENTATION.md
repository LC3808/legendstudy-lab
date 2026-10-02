# MATH-4B — Evaluation Engine Implementation (status)

**Status:** IMPLEMENTATION (deterministic / provider-independent). No live model/CAS call, no
Production, no DB migration, no real student data, no MATH-5 hint engine.
**Date:** 2026-10-02
**Repository:** `LC3808/legendstudy-lab` · feature branch `claude/math-vision-input-3b`.
**Authorities:** [MATH-4A](MATH-4_EVALUATION_ENGINE_CONTRACT.md); MATH-1/2/3/5/6/7 preserved.
APP: commit `17e528b…`, MATH-2C `20261002000100` + MATH-2D `20261002000200`
(runtime SHA `b40bf7224a84658308ff1640b639acb857e379998211131d97a688a9711fe049`, verified).

## Exact runtime surface bound (read from MATH-2D/2C, not invented)
- `math_evaluation(p_request)` — **worker-only**, dto `math-worker-v1`; actions `claim` {evaluation_id},
  `finalize` {evaluation_id, lease_token, output}, `fail` {evaluation_id, lease_token, error_code}.
- Finalize `output` is the strict MATH-2C `math-eval-v1`: `steps, edges, errors, causes, core, hints,
  references, paths, criteria, rubric, overall, provenance, progression, generated_solution` +
  selected-extraction pin — mirrored exactly in `src/lib/math-eval/types.ts`.

## What was implemented (`src/lib/math-eval/`, provider-independent)
| module | role |
| --- | --- |
| `types.ts` | `math-eval-v1` output types (exact server schema) + evaluator adapter interfaces; student rubric scale distinct from HQ; `MATH_EVAL_CREDIT_AUTHORITY = MATH_BILLING_BINDING` |
| `validation.ts` | canonical fail-closed validator: DAG (self/dup/missing-endpoint/cycle), every PROPAGATED error has a cause, only MATERIAL may be ROOT, grounding (steps→pinned regions, errors→steps, core→errors/steps), pinned references, criteria coverage, no invented points, unknown-rubric fail-closed, SHORT_ANSWER brevity firewall |
| `evaluator.ts` | provider-independent `MathEvaluatorAdapter` (deterministic scripted/derived test doubles; no live model) |
| `fixtures.ts` | synthetic E-scenario builders |
| `runtime/contract.ts` | `math-worker-v1` claim/finalize/fail payloads + claim context |
| `runtime/worker-client.ts` | worker-only `MathEvaluationWorkerClient` + `runWorkerEvaluation` (claim → derive input → evaluate → validate → finalize **or** fail; atomic, no partial publish) |
| `runtime/mock-eval-server.ts` | deterministic MATH-2D emulation (worker-only, lifecycle gate, fence/lease, finalize idempotency/conflict/stale) |

(Shared transport reused from `src/lib/math-input/runtime/`; its `MathRpcFunction` union gained
`math_evaluation`.)

## Contract fidelity (test-enforced, E01–E35)
- Response formats SHORT_ANSWER / SHORT_REASONING / FULL_SOLUTION / PROOF depth is driven by canonical
  `response_format`; **SHORT_ANSWER brevity firewall** rejects invented reasoning errors (E03).
- Answer verification separate from coverage; **correct-answer/invalid-reasoning (E07)** and
  **wrong-answer/mostly-valid (E08)** both preserved; **no universal numeric score**.
- Step statuses + logical DAG (self/dup/cross/cycle rejected) kept **distinct** from causal
  propagation; every propagated error needs a cause; **only MATERIAL errors become roots**; freeze
  captured in the finalized output.
- Valid alternative / novel paths accepted (E12/E13); uncertain equivalence → `NEEDS_HUMAN_REVIEW`,
  a **valid** evaluation, not a failure (E14/E35).
- Provenance OFFICIAL / VERIFIED_INTERNAL / AI_GENERATED_REFERENCE preserved; AI reference cannot
  masquerade as official (unpinned reference rejected, E17); official points only where published
  (E18/E19).
- Grounding: hallucinated step/claim rejected (E27/E28); extraction regions must be pinned (E20).
- Runtime: fail-closed finalize atomicity (E30), stale fence (E31), idempotent finalize (E32),
  changed-duplicate conflict (E33), lifecycle wins (E34); **students cannot finalize** (worker-only).
- Credit: evaluation uses the existing Math billing binding; the engine computes no Credit/price.

## Physical binding = FOLLOW_UP
LAB stays a consumer. `runWorkerEvaluation` validates and finalizes against the MATH-2D surface; the
worker transport (Cloudflare Pages Function carrying the trusted evaluation-worker role) is a separate
activation step. The server's full strict `math_finalize_evaluation` schema is the APP's authority;
the LAB validator mirrors its invariants. If a generated-type identifier can't represent a required
semantic fact at activation, stop and report a blocker.

## Out of scope (not implemented)
MATH-5 CORE/hint presentation engine, student result UI, live model bake-off, Production
migration/Storage/AI, real student data, payment logic.

## R21 / loading.tsx
R21 unchanged (`PRODUCTION_ACTIVATION_GATE`). `src/app/loading.tsx` is pre-existing (from the release
foundation) and was **not modified** by MATH-4B; no new loading boundary introduced.

## Next
OWNER/CHATGPT REVIEW → controlled model bake-off (reuse the E-matrix) → MATH-5B CORE/hint
implementation (consumes the validated `math-eval-v1` facts).
