/**
 * MATH-5B — synthetic learning fixtures (no real data, no live model). Compose MATH-4 outputs that
 * carry CORE + hints for the H01–H35 matrix.
 */

import { baseOutput, evalError, step } from "../math-eval/fixtures";
import type { MathEvalCore, MathEvalHint, MathEvalOutput } from "../math-eval/types";
import { includedReevaluation } from "./runtime/mock-learning-server";
import type { LearningState } from "./runtime/contract";

export function coreItem(overrides: Partial<MathEvalCore> = {}): MathEvalCore {
  return {
    id: "core-1",
    position: 0,
    error_id: "err-1",
    step_id: "step-1",
    title: "부호 처리",
    diagnosis: "3단계에서 부호를 반대로 처리했습니다.",
    why: "이후 계산이 이 값에 의존합니다.",
    next_action: "3단계의 부호부터 다시 확인해 보세요.",
    ...overrides,
  };
}

export function hint(overrides: Partial<MathEvalHint> = {}): MathEvalHint {
  return {
    id: "hint-l1",
    core_id: "core-1",
    level: 1,
    body: "부호가 바뀌는 지점을 기준으로 다시 생각해 보세요.",
    leakage_class: "SAFE_DIRECTION",
    validated: true,
    ...overrides,
  };
}

/** A FULL_SOLUTION output with one root error, a bound CORE, and L0/L1/L2 hints. */
export function outputWithCore(overrides: Partial<MathEvalOutput> = {}): MathEvalOutput {
  return baseOutput({
    steps: [step({ id: "step-1", status: "CALCULATION_ERROR" })],
    errors: [evalError({ id: "err-1", step_id: "step-1", classification: "ROOT", category: "SIGN", materiality: "MATERIAL" })],
    core: [coreItem()],
    hints: [
      hint({ id: "hint-l0", level: 0, leakage_class: "SAFE_DIRECTION", body: "3단계의 부호 처리를 다시 확인해 보세요." }),
      hint({ id: "hint-l1", level: 1, leakage_class: "SAFE_DIRECTION" }),
      hint({ id: "hint-l2", level: 2, leakage_class: "CONCEPT_REVEAL", body: "이 단계에서는 도함수의 부호 판정을 확인해 보세요." }),
    ],
    overall: { status: "COMPLETE", diagnostic: "ANSWER_INCORRECT_APPROACH_MOSTLY_VALID", answer: "INCORRECT", coverage: "ATTEMPTED" },
    ...overrides,
  });
}

/** A server-authoritative LearningState (COMPLETED) with one CORE, L0/L1/L2 hints, one reference. */
export function learningStateFixture(overrides: Partial<LearningState> = {}): LearningState {
  return {
    evaluation_id: "eval-1",
    attempt_id: "att-1",
    lineage_id: "lin-1",
    problem_id: "prob-1",
    leaf_id: "leaf-1",
    response_format: "FULL_SOLUTION",
    resolve_kind: "INITIAL",
    prior_attempt_id: null,
    prior_evaluation_id: null,
    target_step_id: null,
    submitted_scope: "WHOLE_LEAF",
    downstream: null,
    evaluation_state: "COMPLETED",
    completed_at: "2026-10-02T00:00:00.000Z",
    valid_evaluation_available: true,
    review_status: "NOT_REQUIRED",
    core: [
      { core_id: "core-1", position: 0, error_id: "err-1", step_id: "step-1", title: "부호 처리", diagnosis: "부호 오류", why: "이후 계산에 영향", next_action: "3단계부터 다시" },
    ],
    hints: [
      { hint_id: "h-l0", core_id: "core-1", level: 0, available: true, revealed: false, can_reveal: true },
      { hint_id: "h-l1", core_id: "core-1", level: 1, available: true, revealed: false, can_reveal: true },
      { hint_id: "h-l2", core_id: "core-1", level: 2, available: true, revealed: false, can_reveal: false },
    ],
    hint_availability: "FROM_FROZEN_HINTS",
    solutions: [
      { solution_id: "sol-official", target: "REFERENCE", provenance: "OFFICIAL_SOLUTION", physical_origin: "OFFICIAL", reveal_state: "AVAILABLE_ON_EXPLICIT_REQUEST", revealed: false },
    ],
    resolve_kinds: ["FULL_RESOLVE", "STEP_RETRY"],
    included_reevaluation: includedReevaluation(),
    reevaluation_delta: null,
    reference_solution_revealed_before_resolve: false,
    hint_levels_before_resolve: [],
    ...overrides,
  };
}

export function reevaluationDeltaFixture(
  overrides: Partial<import("./runtime/contract").ReevaluationDelta> = {},
): import("./runtime/contract").ReevaluationDelta {
  return {
    prior_evaluation_id: "eval-1",
    target_step_id: null,
    downstream: null,
    summary: "무엇이 달라졌는지",
    delta: [{ kind: "ROOT_ERROR_REMOVED", explanation: "부호 오류 해결" }],
    ...overrides,
  };
}

export function historyEntryFixture(
  overrides: Partial<import("./runtime/contract").LearningHistoryEntry> = {},
): import("./runtime/contract").LearningHistoryEntry {
  return {
    attempt_id: "att-1",
    created_at: "2026-10-02T00:00:00.000Z",
    resolve_kind: "INITIAL",
    prior_attempt_id: null,
    prior_evaluation_id: null,
    target_step_id: null,
    submitted_scope: "WHOLE_LEAF",
    evaluation_id: "eval-1",
    evaluation_state: "COMPLETED",
    completed_at: "2026-10-02T00:00:00.000Z",
    reevaluation_delta: null,
    core_ids: ["core-1"],
    exposed_hint_levels: [],
    solution_revealed: false,
    reference_solution_revealed_before_resolve: false,
    ...overrides,
  };
}
