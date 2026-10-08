/**
 * MATH-4B — synthetic fixture builders for the E01–E35 matrix. No real student data, no live model.
 */

import { MATH_RUBRIC_VERSION } from "./types";
import type {
  MathEvalError,
  MathEvalOutput,
  MathEvalStep,
  MathEvaluationInput,
  RubricVerdict,
} from "./types";

export function evalInput(overrides: Partial<MathEvaluationInput> = {}): MathEvaluationInput {
  return {
    evaluationId: "eval-1",
    attemptId: "att-1",
    leafId: "leaf-1",
    responseFormat: "FULL_SOLUTION",
    requiresReasoning: true,
    selectedExtractionId: "run-c1",
    regionIds: ["rg-1", "rg-2", "rg-3"],
    authoritySolutions: [{ id: "sol-official", provenance: "OFFICIAL" }],
    criteria: [],
    priorEvaluationId: null,
    ...overrides,
  };
}

export function step(overrides: Partial<MathEvalStep> = {}): MathEvalStep {
  return {
    id: "step-1",
    position: 0,
    kind: "CALCULATION",
    representation: "f'(x)=2x",
    status: "VALID",
    explanation: "",
    regions: ["rg-1"],
    ...overrides,
  };
}

export function evalError(overrides: Partial<MathEvalError> = {}): MathEvalError {
  return {
    id: "err-1",
    step_id: "step-1",
    classification: "ROOT",
    category: "SIGN",
    materiality: "MATERIAL",
    explanation: "부호 오류",
    ...overrides,
  };
}

const RUBRIC_OK: Record<string, RubricVerdict> = {
  problem_understanding: "ADEQUATE",
  concept_selection: "ADEQUATE",
  solution_strategy: "ADEQUATE",
  logical_development: "ADEQUATE",
  computation_accuracy: "ADEQUATE",
  justification_completeness: "ADEQUATE",
  final_conclusion: "ADEQUATE",
  mathematical_writing: "ADEQUATE",
};

/** A minimal, valid FULL_SOLUTION output (correct answer, one valid step, no errors, CORE empty). */
export function baseOutput(overrides: Partial<MathEvalOutput> = {}): MathEvalOutput {
  return {
    steps: [step()],
    edges: [],
    errors: [],
    causes: [],
    core: [],
    hints: [],
    references: [],
    paths: [{ key: "primary", verdict: "OFFICIAL_PATH_MATCH", explanation: "" }],
    criteria: [],
    rubric: { rubric_version: MATH_RUBRIC_VERSION, dimensions: { ...RUBRIC_OK } },
    overall: {
      status: "COMPLETE",
      diagnostic: "ANSWER_CORRECT_AND_REASONING_SUFFICIENT",
      answer: "CORRECT",
      coverage: "ATTEMPTED",
    },
    provenance: { model_provider: "mock", model_name: "mock", prompt_version: "p1", contract_version: "math-eval-v1" },
    progression: null,
    generated_solution: null,
    selected_extraction: "run-c1",
    ...overrides,
  };
}

/** A minimal valid SHORT_ANSWER output (answer only; reasoning dimensions NA). */
export function shortAnswerOutput(overrides: Partial<MathEvalOutput> = {}): MathEvalOutput {
  return baseOutput({
    steps: [],
    paths: [],
    rubric: {
      rubric_version: MATH_RUBRIC_VERSION,
      dimensions: {
        problem_understanding: "NOT_APPLICABLE",
        final_conclusion: "ADEQUATE",
        computation_accuracy: "NOT_APPLICABLE",
        justification_completeness: "NOT_APPLICABLE",
        mathematical_writing: "NOT_APPLICABLE",
      },
    },
    overall: { status: "COMPLETE", diagnostic: "ANSWER_CORRECT_AND_REASONING_SUFFICIENT", answer: "CORRECT", coverage: "ATTEMPTED" },
    ...overrides,
  });
}
