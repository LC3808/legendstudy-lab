# MATH-6B — Re-solve / Reevaluation / Learning-History Implementation (status)

**Status:** IMPLEMENTATION (consumer over MATH-2E). No live model, no Production, no DB write, no
Quality Console, no payment, no real student data. MATH-4 remains the sole evaluation authority; MATH-6
never recomputes correctness.
**Date:** 2026-10-02
**Repository:** `LC3808/legendstudy-lab` · branch `claude/math-vision-input-3b`.
**Semantic authority:** [MATH-6A](MATH-6_RESOLVE_REEVALUATION_LEARNING_HISTORY_CONTRACT.md); consumes
MATH-4/MATH-5; preserves MATH-7. legendstudy-app / Unified Wiki unchanged.

## Backend authority (read-only, verified)
- APP commit `cd215a6d88c0f72e59d06478bf4727ed676ca5f9`
- MATH-2E migration `20261002000300_math_learning_runtime.sql`
- SHA-256 `fa0fbb507dd650d2e684f7dc9bc9375c6c5db09eac64405a438ad63206933f7d` (verified ✓)
- RPC `public.math_learning(p_request)` · dto `math-learning-v1`

## Runtime actions bound (exact MATH-2E payloads)
- `create_resolve_attempt` {client_submission_id, leaf_id, kind, predecessor_id, prior_evaluation_id,
  input_kind, typed_answer?, target_step_id?} → {attempt_id}
- `request_reevaluation` {attempt_id, client_submission_id} → {evaluation_id, commercial_context:
  "INCLUDED_REEVALUATION", additional_credit:0} (**included-only; no paid fallback**)
- `read_learning_history` {evaluation_id, limit?, before_at?+before_id?} → {lineage_id, attempts[],
  included_reevaluation, next_cursor}
(plus the already-bound read_learning_state / reveal_hint / reveal_solution)

## What was implemented (`src/lib/math-learning/`, client-safe; one canonical client)
| module | role |
| --- | --- |
| `runtime/contract.ts` | +create_resolve_attempt / request_reevaluation / read_learning_history / reevaluation-delta / history-entry types |
| `runtime/learning-client.ts` | one `math_learning` client; +createResolveAttempt / requestReevaluation / readLearningHistory |
| `resolve.ts` | `prepareResolveAttempt` (validate kind vs server-allowed, PARTIAL_RESOLVE fail-closed, lineage from state not client, STEP_RETRY requires target, SHORT_ANSWER_RESOLVE format check) |
| `delta.ts` | `summarizeReevaluationDelta` — "무엇이 달라졌나"; answer vs reasoning axes separate; NOT_REASSESSED distinct; no numeric score |
| `history.ts` | `buildLearningTimeline` — append-only, oldest-first, >2 attempts, no UUIDs/leases/billing in view |
| `runtime/mock-learning-server.ts` | +create_resolve_attempt / request_reevaluation / read_learning_history (lineage/target validation, idempotency, included-only, lifecycle, pagination) |
| `components/math-learning/learning-delta.tsx`, `learning-history.tsx` | minimal mobile-first delta + history UI (text status, not color-only) |

## Contract fidelity (RSL01–RSL40, test-enforced)
- Resolve kinds `STEP_RETRY` / `FULL_RESOLVE` / `SHORT_ANSWER_RESOLVE`; **PARTIAL_RESOLVE rejected**
  (fail closed). Every re-solve is a new immutable attempt; prior attempt/evaluation never mutated.
- **Extraction confirmation / solution reveal / hint reveal are NOT re-solves** (no resolve attempt
  created). Same-lineage is backend authority (byte-different revised text stays same lineage); foreign
  lineage / foreign STEP_RETRY target rejected.
- **STEP_RETRY downstream stays NOT_REASSESSED**, represented distinctly from resolved/persisting.
  FULL_RESOLVE scope = WHOLE_LEAF; SHORT_ANSWER_RESOLVE fabricates no reasoning requirement.
- **Included reevaluation**: count 1, **336h window is server authority** (client never recomputes;
  uses `included_reevaluation.status`/`expires_at` verbatim). Free-reeval copy shows **only** when
  status AVAILABLE; EXPIRED/CONSUMED/UNAVAILABLE show nothing. Included-only `request_reevaluation`
  with a non-AVAILABLE projection is rejected — **no accidental paid fallback**. A mere request does
  not mark the entitlement consumed (settle-time server fact).
- `HUMAN_REVIEW_REQUIRED` is a valid evaluation, not a processing failure.
- Learning delta: root removed / root-removed-plus-new-root (both shown) / root persists /
  no-material-change / answer-vs-reasoning separation. Propagated errors stay grouped under their root.
- Learning history: append-only, ordered, >2 attempts; hint/solution exposure is factual context (no
  inferred cognition, no scoring penalty, no separate Credit).
- Lifecycle restriction blocks new resolve/reevaluation; idempotent retry; changed-key conflict.

## Orchestration (§53)
read_learning_state → `prepareResolveAttempt` (validate kind/lineage) → create_resolve_attempt →
(new evidence through the existing MATH-3 input pipeline to READY_FOR_EVALUATION — reused, not
re-built) → request_reevaluation → read canonical result via existing evaluation surfaces →
read_learning_state/history → render delta. The client never shortcuts an unevaluated answer into the
history UI, and never bypasses server-authoritative input readiness.

## Remaining gates (not in scope; still open)
R21 Storage runtime · gateway/worker deployment · ADR-2 Math erasure · controlled real-model bake-off
· MATH-7B Quality Console · Production migration/apply · real student pilot. `loading.tsx` unchanged;
no new loading boundary added.

## Next
OWNER/CHATGPT REVIEW → controlled model bake-off → MATH-7B Quality Console → R21 / ADR-2 / runtime
activation gates.
