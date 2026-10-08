/**
 * MATH-7B — synthetic Quality fixtures (no real data, no live provider).
 */

import {
  HQ_MATH_DIMENSIONS,
  HQ_MATH_RUBRIC_VERSION,
  HQ_MATH_WRITE_DTO,
  type HqMathDimension,
  type HqMathJudgment,
  type HqVerdict,
  type MathQualityCaseDetail,
} from "./types";

export function caseDetailFixture(overrides: Partial<MathQualityCaseDetail> = {}): MathQualityCaseDetail {
  return {
    evaluation_id: "eval-1",
    output_sha256: "hash-eval-1",
    response_format: "FULL_SOLUTION",
    review_status: "NOT_REQUIRED",
    student_answer_status: "INCORRECT",
    solution_step_ids: ["step-1", "step-2"],
    root_error_ids: ["err-1"],
    extraction_region_ids: ["rg-1"],
    reference_path_ids: ["ref-1"],
    student_path_ids: ["stu-1"],
    has_hints: true,
    has_generated_solution: false,
    has_prior_evaluation: false,
    requires_reasoning: true,
    requires_extraction: true,
    ...overrides,
  };
}

/** All-OK rubric with conditional dimensions set to NA iff their artifact is absent. */
export function rubricAllOk(
  detail: MathQualityCaseDetail,
  overrides: Partial<Record<HqMathDimension, HqVerdict>> = {},
): Record<HqMathDimension, HqVerdict> {
  const na = {
    extraction_fidelity: !detail.requires_extraction,
    step_reasoning: !detail.requires_reasoning,
    hint_quality: !detail.has_hints,
    progression: !detail.has_prior_evaluation,
    generated_solution: !detail.has_generated_solution,
  } as Record<string, boolean>;
  const result = {} as Record<HqMathDimension, HqVerdict>;
  for (const dim of HQ_MATH_DIMENSIONS) result[dim] = na[dim] ? "NA" : "OK";
  return { ...result, ...overrides };
}

let csidSeq = 0;
export function judgmentFixture(
  detail: MathQualityCaseDetail,
  overrides: Partial<HqMathJudgment> = {},
): HqMathJudgment {
  csidSeq += 1;
  return {
    dto_version: HQ_MATH_WRITE_DTO,
    math_evaluation_id: detail.evaluation_id,
    expected_output_sha256: detail.output_sha256,
    client_submission_id: `csid-${csidSeq}`,
    rubric_version: HQ_MATH_RUBRIC_VERSION,
    overall_disposition: "PASS",
    rubric_result: rubricAllOk(detail),
    findings: [],
    reference_context_reviewed: true,
    ...overrides,
  };
}
