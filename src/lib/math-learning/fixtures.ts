/**
 * MATH-5B — synthetic learning fixtures (no real data, no live model). Compose MATH-4 outputs that
 * carry CORE + hints for the H01–H35 matrix.
 */

import { baseOutput, evalError, step } from "../math-eval/fixtures";
import type { MathEvalCore, MathEvalHint, MathEvalOutput } from "../math-eval/types";

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
