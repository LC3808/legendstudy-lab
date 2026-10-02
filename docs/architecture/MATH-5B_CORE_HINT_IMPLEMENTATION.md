# MATH-5B — CORE / Progressive Hint / Solution Reveal Implementation (status)

**Status:** IMPLEMENTATION (consumer + gating + validation). No live model call, no Production, no DB
write, no re-solve engine (MATH-6), no Quality Console (MATH-7), no real student data.
**Date:** 2026-10-02
**Repository:** `LC3808/legendstudy-lab` · feature branch `claude/math-vision-input-3b`.
**Authorities:** [MATH-5A](MATH-5_CORE_HINT_LEARNING_CONTRACT.md); consumes MATH-4 facts; preserves
MATH-6/MATH-7. **MATH-5 never recomputes mathematical correctness.** APP MATH-2C/2D unchanged.

## What was implemented (`src/lib/math-learning/`, client-safe)
| module | role |
| --- | --- |
| `types.ts` | learning-view types (CoreView, hint availability, leakage result, MATH-6 handoff, solution-reveal context) |
| `core.ts` | CORE presentation from `MathEvalOutput.core` (primary/secondary, no numeric student score); propagated errors grouped under their root; reference-provenance labels (대학 공식 해설 / 레전드스터디 검증 풀이 / AI 참고 풀이) |
| `hints.ts` | multi-signal leakage classification (SAFE / POTENTIAL_LEAK / FORBIDDEN_LEAK), fail-closed hint validation (binding/grounding/level/version/format), progressive gating (L2 requires L1) |
| `handoff.ts` | MATH-6 learning-context handoff + solution-reveal context; re-solve CTA note only when backend eligibility is AVAILABLE |
| `runtime/contract.ts` | hint reveal bound to the EXISTING `math_input` `reveal_hint` action; `SolutionRevealRepository` marks the one BACKEND_FOLLOW_UP |
| `runtime/learning-client.ts` | browser-safe `LearningRuntimeClient` (gated reveal) + in-memory solution-reveal repo |
| `runtime/mock-learning-server.ts` | deterministic `reveal_hint` server (gating + idempotency + no Credit) |
| `components/math-learning/learning-guidance.tsx` | minimal mobile-first UI (CORE, L0, gated L1/L2, solution reveal with notice, provenance, re-solve CTA) |

## Contract fidelity (H01–H35, test-enforced)
- CORE = smallest high-impact next target; **CORE may be empty** (completion state); propagated
  consequences grouped under their root, never independent; primary/secondary (no numeric score).
- **L0** = what to fix (grounded, SAFE); **L1** = SAFE_DIRECTION; **L2** = CONCEPT_REVEAL. Leakage is
  classified from declared class × level/format policy **plus** known-answer containment — not sole
  string matching. SHORT_ANSWER L1/L2 never reveal the required answer; no verbatim full solution/
  proof (SOLUTION_REVEAL always forbidden as a hint). Response-format-aware across all four formats.
- **Progressive reveal is gated**: L0 delivered with the evaluation; L1 on request; L2 requires L1.
  L1/L2 bodies are NOT preloaded — retrieved via `math_input reveal_hint` (server-gated).
- **Early solution reveal (HYBRID)**: allowed with a learning notice, no hard lock; reveal records
  learning context; exposure ≠ cognition; **no scoring penalty, no separate Credit** (hints or
  solution). Provenance always drives the label; AI never labeled official.
- **Hint exposure** recorded server-side via reveal_hint; idempotent (same client_submission_id →
  replayed, one exposure); changed-key conflict.
- **MATH-6 handoff** exposes prior CORE, exposed hint levels, reference-reveal flag, evaluation/leaf
  lineage, and defers commercial eligibility to the backend (never a false free-reeval promise).
- **Human Quality evidence** preserved (CORE, L0/L1/L2, leakage, response_format, provenance) for
  `hq-math-rubric-v1` hint_quality review.

## Hint generation strategy
L0 is canonical from CORE facts; L1/L2 are deterministic/pre-generated candidates (frozen in the
MATH-4 evaluation output), validated before reveal. A provider-independent generator can wrap the
same interface later; **no live model call** at reveal time.

## BACKEND_FOLLOW_UPS
- **Reference-solution reveal recording** has no dedicated MATH-2D runtime op. LAB uses
  `SolutionRevealRepository` (in-memory now); Codex must add a backend operation so the reveal context
  is durably recorded (not client-only) before Production. (Hint reveal already binds to the existing
  `math_input reveal_hint` action — no new op needed there.)

## R21 / loading.tsx
R21 unchanged. `src/app/loading.tsx` pre-existing, **not modified**; no new loading boundary.

## Out of scope (not implemented)
Re-solve/reevaluation (MATH-6B), Quality Console (MATH-7), live model generation, Production, payment.

## Next
OWNER/CHATGPT REVIEW → controlled model bake-off → MATH-6B re-solve/reevaluation implementation.
