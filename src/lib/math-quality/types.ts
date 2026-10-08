/**
 * MATH-7B — Math Human Quality / Quality Console consumer types (LAB).
 *
 * Human Quality reviews the AI evaluation's QUALITY — never a student re-grade.
 *   HQ PASS ≠ student correct · HQ FAIL ≠ student wrong.
 * MATH-4 is the sole mathematical-evaluation authority; MATH-7 recomputes no student score.
 *
 * Distinct from the student diagnostic rubric: HQ verdict scale is OK/CONCERN/FAIL/NA. Typed Math
 * finding targets replace Humanities SENTENCE semantics. `ql-read-v1`/`hq-read-v1` are NOT touched.
 */

export const HQ_MATH_RUBRIC_VERSION = "hq-math-rubric-v1" as const;
export const HQ_MATH_WRITE_DTO = "hq-math-write-v1" as const;

export type HqVerdict = "OK" | "CONCERN" | "FAIL" | "NA";

/** 11 canonical hq-math-rubric-v1 dimensions (MATH-7A §5). */
export const HQ_MATH_DIMENSIONS = [
  "diagnosis",
  "core_priority",
  "actionability",
  "evidence_adherence",
  "valid_path_preservation",
  "hallucination_absence",
  "extraction_fidelity",
  "step_reasoning",
  "hint_quality",
  "progression",
  "generated_solution",
] as const;
export type HqMathDimension = (typeof HQ_MATH_DIMENSIONS)[number];

/** Conditional dimensions: must be NA iff the artifact is absent (MATH-7A §7). */
export const HQ_CONDITIONAL_DIMENSIONS: readonly HqMathDimension[] = [
  "extraction_fidelity",
  "step_reasoning",
  "hint_quality",
  "progression",
  "generated_solution",
];

export type HqDisposition = "PASS" | "PASS_WITH_NOTES" | "NEEDS_REVIEW" | "FAIL";

export type HqFindingCategory =
  | "FALSE_CORRECTION"
  | "INVENTED_ERROR"
  | "EVIDENCE_MISREAD"
  | "UNSUPPORTED_CLAIM"
  | "CORE_PRIORITY_ERROR"
  | "PROGRESSION_ERROR"
  | "UNDER_SPECIFIED_GUIDANCE"
  | "MISSING_IMPORTANT_ISSUE"
  | "OTHER"
  | "EXTRACTION_MISREAD"
  | "ROOT_PROPAGATION_ERROR"
  | "ALTERNATIVE_PATH_REJECTION";

export type HqSeverity = "MINOR" | "MATERIAL" | "CRITICAL";

export type HqTargetKind =
  | "OVERALL"
  | "SOLUTION_STEP"
  | "ROOT_ERROR"
  | "EXTRACTION_REGION"
  | "ALTERNATIVE_PATH";

/** ALTERNATIVE_PATH distinguishes a REFERENCE path from the STUDENT evaluated path. */
export type AlternativePathSide = "REFERENCE" | "STUDENT";

export interface HqFindingTarget {
  kind: HqTargetKind;
  /** null for OVERALL; otherwise a canonical id present in the reviewed case detail. */
  ref: string | null;
  /** Only for ALTERNATIVE_PATH. */
  side?: AlternativePathSide;
}

export interface HqFinding {
  category: HqFindingCategory;
  severity: HqSeverity;
  target: HqFindingTarget;
  note?: string;
}

export type HqSelectionReason =
  | "EARLY_CENSUS"
  | "RANDOM_SAMPLE"
  | "UNCERTAINTY"
  | "HUMAN_REVIEW_REQUIRED"
  | "MODEL_CHANGE"
  | "REFERENCE_CONFLICT"
  | "OPERATOR_SELECTED"
  | "INCIDENT_REVIEW";

export type HqRecommendedAction =
  | "NONE"
  | "REVIEW_EVALUATION"
  | "REVIEW_CONTENT"
  | "REVIEW_EXTRACTION"
  | "REVIEW_HINT"
  | "ESCALATE_MODEL_QUALITY";

/** hq-math-write-v1 judgment payload (exact MATH-2E keys; reviewer identity is server-derived). */
export interface HqMathJudgment {
  dto_version: typeof HQ_MATH_WRITE_DTO;
  math_evaluation_id: string;
  expected_output_sha256: string;
  client_submission_id: string;
  rubric_version: typeof HQ_MATH_RUBRIC_VERSION;
  overall_disposition: HqDisposition;
  rubric_result: Partial<Record<HqMathDimension, HqVerdict>>;
  findings: HqFinding[];
  reference_context_reviewed: boolean;
  selection_reason?: HqSelectionReason;
  recommended_action?: HqRecommendedAction;
  summary_note?: string;
  supersedes_judgment_id?: string;
}

/* --------------------------------------------------- read: case detail (evidence for review) */

/** The canonical ids/flags a reviewer needs to bind findings + conditional NA + hash (MATH-7A §4). */
export interface MathQualityCaseDetail {
  evaluation_id: string;
  output_sha256: string;
  response_format: "SHORT_ANSWER" | "SHORT_REASONING" | "FULL_SOLUTION" | "PROOF";
  review_status: "NOT_RECORDED" | "NOT_REQUIRED" | "HUMAN_REVIEW_REQUIRED";
  /** HQ PASS/FAIL is about the AI, independent of this. */
  student_answer_status: "CORRECT" | "INCORRECT" | "PARTIALLY_CORRECT" | "NOT_DETERMINABLE";
  solution_step_ids: string[];
  root_error_ids: string[];
  extraction_region_ids: string[];
  reference_path_ids: string[];
  student_path_ids: string[];
  has_hints: boolean;
  has_generated_solution: boolean;
  has_prior_evaluation: boolean;
  requires_reasoning: boolean;
  requires_extraction: boolean;
}

/* --------------------------------------------------- read: review-state projection */

export type HqReviewState =
  | "UNREVIEWED"
  | "SINGLE_REVIEW"
  | "MULTIPLE_REVIEWS"
  | "CORRECTED"
  | "DISAGREEMENT"
  | "NOT_COMPARABLE";

export interface HqJudgmentRecord {
  judgment_id: string;
  math_evaluation_id: string;
  reviewer_display: string | null; // null = deleted reviewer (E2 SET NULL)
  rubric_version: string;
  overall_disposition: HqDisposition;
  superseded: boolean;
  supersedes_judgment_id: string | null;
  created_at: string;
}
