/**
 * MATH-4B — Mathematical Essay evaluation engine canonical types (LAB consumer).
 *
 * MathEvalOutput is the established LAB domain projection. It is NOT the physical SQL
 * finalize JSON shape. runtime/physical-contract.ts explicitly maps it to unchanged
 * APP MATH-2C/D/E; canonical SQL validation remains the final authority. The local
 * validator and provider-independent consumer contract are preserved.
 *
 * APP authority: commit 17e528b…, MATH-2C 20261002000100 + MATH-2D 20261002000200
 * (runtime SHA-256 b40bf7224a84658308ff1640b639acb857e379998211131d97a688a9711fe049).
 */

export type MathResponseFormat = "SHORT_ANSWER" | "SHORT_REASONING" | "FULL_SOLUTION" | "PROOF";

/** Answer layer — never encodes "not attempted" (that is coverage, §6). */
export type AnswerStatus = "CORRECT" | "INCORRECT" | "PARTIALLY_CORRECT" | "NOT_DETERMINABLE";
export type CoverageStatus = "NOT_ATTEMPTED" | "PARTIAL_ATTEMPT" | "ATTEMPTED";

export type StepStatus =
  | "VALID"
  | "INVALID"
  | "INSUFFICIENT_JUSTIFICATION"
  | "CALCULATION_ERROR"
  | "LOGICAL_GAP"
  | "PROPAGATED_ERROR"
  | "NOT_ASSESSABLE";

export type ErrorClassification = "ROOT" | "PROPAGATED";
export type Materiality = "MATERIAL" | "MINOR" | "PRESENTATION" | "NON_ERROR_VARIATION";

/** Approved MATH-4A §13 launch root-error taxonomy (do not casually rename/reduce). */
export type RootErrorCategory =
  | "CONDITION_MISREAD"
  | "CONCEPT_SELECTION"
  | "STRATEGY"
  | "LOGICAL_GAP"
  | "CALCULATION"
  | "SIGN"
  | "ALGEBRAIC_TRANSFORMATION"
  | "CASE_OMISSION"
  | "DOMAIN_RANGE"
  | "THEOREM_MISUSE"
  | "GRAPH_INTERPRETATION"
  | "JUSTIFICATION"
  | "CONCLUSION"
  | "OTHER";

/** Student diagnostic rubric scale — intentionally DISTINCT from HQ OK/CONCERN/FAIL/NA (§16). */
export type RubricVerdict =
  | "STRONG"
  | "ADEQUATE"
  | "NEEDS_IMPROVEMENT"
  | "INSUFFICIENT"
  | "NOT_APPLICABLE"
  | "NOT_ASSESSABLE";

export type OverallDiagnostic =
  | "ANSWER_CORRECT_AND_REASONING_SUFFICIENT"
  | "ANSWER_CORRECT_REASONING_INCOMPLETE"
  | "ANSWER_INCORRECT_APPROACH_MOSTLY_VALID"
  | "FUNDAMENTAL_APPROACH_ERROR"
  | "NOT_DETERMINABLE";

export type EvaluationOverallStatus = "COMPLETE" | "PARTIAL" | "NEEDS_HUMAN_REVIEW";
export type ReferenceProvenance = "OFFICIAL" | "VERIFIED_INTERNAL" | "AI_GENERATED_REFERENCE";
export type PathVerdict =
  | "OFFICIAL_PATH_MATCH"
  | "ALTERNATIVE_VALID_PATH"
  | "INVALID_PATH"
  | "INSUFFICIENT_JUSTIFICATION"
  | "MATHEMATICAL_EQUIVALENCE_UNCERTAIN";

export const MATH_RUBRIC_VERSION = "math-rubric-v1" as const;

/* ------------------------------------------------------------------ output (math-eval-v1) */

export interface MathEvalStep {
  id: string;
  position: number;
  kind: string;
  representation: string;
  status: StepStatus;
  explanation: string;
  /** Extraction region ids; each MUST belong to the selected extraction (grounding). */
  regions: string[];
}
export interface MathEvalEdge {
  from: string;
  to: string;
}
export interface MathEvalError {
  id: string;
  step_id: string;
  classification: ErrorClassification;
  category: RootErrorCategory;
  materiality: Materiality;
  explanation: string;
}
export interface MathEvalCause {
  root: string;
  consequence: string;
}
export interface MathEvalCore {
  id: string;
  position: number;
  error_id: string | null;
  step_id: string | null;
  title: string;
  diagnosis: string;
  why: string;
  next_action: string;
}
export interface MathEvalHint {
  id: string;
  core_id: string;
  level: 0 | 1 | 2;
  body: string;
  leakage_class: "SAFE_DIRECTION" | "CONCEPT_REVEAL" | "SOLUTION_REVEAL";
  validated: boolean;
}
export interface MathEvalPath {
  key: string;
  verdict: PathVerdict;
  explanation: string;
}
export interface MathEvalCriterionResult {
  criterion_id: string;
  satisfied: "SATISFIED" | "PARTIALLY_SATISFIED" | "NOT_SATISFIED" | "NOT_DETERMINABLE";
  awarded_points?: number | null;
  reason: string;
}
export interface MathEvalOverall {
  status: EvaluationOverallStatus;
  diagnostic: OverallDiagnostic;
  answer: AnswerStatus;
  coverage: CoverageStatus;
}
export interface MathEvalProvenance {
  model_provider: string;
  model_name: string;
  prompt_version: string;
  contract_version: string;
}
export interface MathEvalProgression {
  prior_evaluation_id: string;
  core_corrected: boolean;
  root_error_removed: boolean;
  new_independent_error: boolean;
  answer_now_correct: boolean;
  justification_improved: boolean;
  no_material_change: boolean;
}
export interface MathEvalGeneratedSolution {
  origin: ReferenceProvenance;
  body: string;
}

export interface MathEvalOutput {
  steps: MathEvalStep[];
  edges: MathEvalEdge[];
  errors: MathEvalError[];
  causes: MathEvalCause[];
  core: MathEvalCore[];
  hints: MathEvalHint[];
  references: string[];
  paths: MathEvalPath[];
  criteria: MathEvalCriterionResult[];
  rubric: { rubric_version: string; dimensions: Record<string, RubricVerdict> };
  overall: MathEvalOverall;
  provenance: MathEvalProvenance;
  progression: MathEvalProgression | null;
  generated_solution: MathEvalGeneratedSolution | null;
  selected_extraction: string;
}

/* ------------------------------------------------------------------ evaluator adapter */

export interface PinnedAuthoritySolution {
  id: string;
  provenance: ReferenceProvenance;
}
export interface PinnedCriterion {
  criterion_id: string;
  /** Published official max points, or null when the university published none (no invented score). */
  max_points: number | null;
}

/** What the evaluator consumes — assembled from READY_FOR_EVALUATION + the MATH-2D claim context. */
export interface MathEvaluationInput {
  evaluationId: string;
  attemptId: string;
  leafId: string;
  responseFormat: MathResponseFormat;
  /** Whether the profile requires reasoning (drives SHORT_ANSWER firewall). */
  requiresReasoning: boolean;
  selectedExtractionId: string | null;
  /** Immutable server claim package, required by a real model adapter. */
  canonicalPackage?: Readonly<Record<string, unknown>>;
  /** Extraction region ids available for grounding step evidence. */
  regionIds: string[];
  authoritySolutions: PinnedAuthoritySolution[];
  criteria: PinnedCriterion[];
  priorEvaluationId: string | null;
}

export interface MathEvaluatorCandidate {
  output: MathEvalOutput;
}

export interface MathEvaluatorAdapter {
  readonly providerId: string;
  readonly modelId: string;
  evaluate(input: MathEvaluationInput): Promise<MathEvaluatorCandidate>;
}

/** Evaluation uses the existing Math billing binding; the engine never computes Credit (§24). */
export const MATH_EVAL_CREDIT_AUTHORITY = "MATH_BILLING_BINDING" as const;
