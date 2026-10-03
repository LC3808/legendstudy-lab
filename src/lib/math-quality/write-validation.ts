/**
 * MATH-7B — fail-closed validation of an hq-math-write-v1 judgment before submit. Mirrors the server
 * invariants (rubric version, all 11 dimensions, conditional NA, disposition↔verdict/finding
 * consistency, typed finding-target binding to canonical ids, output-hash binding). Reviews AI
 * quality; never a student re-grade.
 */

import {
  HQ_CONDITIONAL_DIMENSIONS,
  HQ_MATH_DIMENSIONS,
  HQ_MATH_RUBRIC_VERSION,
  HQ_MATH_WRITE_DTO,
  type HqFinding,
  type HqMathJudgment,
  type HqVerdict,
  type MathQualityCaseDetail,
} from "./types";

export type HqWriteCode =
  | "UNKNOWN_WRITE_DTO"
  | "UNKNOWN_RUBRIC_VERSION"
  | "MISSING_DIMENSION"
  | "INVALID_VERDICT"
  | "CONDITIONAL_NA_REQUIRED"
  | "CONDITIONAL_NA_FORBIDDEN"
  | "STALE_OUTPUT_HASH"
  | "DISPOSITION_PASS_REQUIRES_CLEAN"
  | "DISPOSITION_NOTES_REQUIRES_MINOR"
  | "FINDING_TARGET_UNBOUND"
  | "FINDING_TARGET_SHAPE"
  | "REFERENCE_CONTEXT_NOT_REVIEWED";

export interface HqWriteValidation {
  ok: boolean;
  issues: HqWriteCode[];
}

const VERDICTS: ReadonlySet<HqVerdict> = new Set<HqVerdict>(["OK", "CONCERN", "FAIL", "NA"]);

/** Which conditional dimensions must be NA, given the case (artifact absent ⇒ NA). */
function requiredNa(detail: MathQualityCaseDetail): Set<string> {
  const na = new Set<string>();
  if (!detail.requires_extraction) na.add("extraction_fidelity");
  if (!detail.requires_reasoning) na.add("step_reasoning");
  if (!detail.has_hints) na.add("hint_quality");
  if (!detail.has_prior_evaluation) na.add("progression");
  if (!detail.has_generated_solution) na.add("generated_solution");
  return na;
}

function validateTarget(finding: HqFinding, detail: MathQualityCaseDetail): HqWriteCode | null {
  const { kind, ref, side } = finding.target;
  switch (kind) {
    case "OVERALL":
      return ref === null ? null : "FINDING_TARGET_SHAPE";
    case "SOLUTION_STEP":
      return ref && detail.solution_step_ids.includes(ref) ? null : "FINDING_TARGET_UNBOUND";
    case "ROOT_ERROR":
      return ref && detail.root_error_ids.includes(ref) ? null : "FINDING_TARGET_UNBOUND";
    case "EXTRACTION_REGION":
      return ref && detail.extraction_region_ids.includes(ref) ? null : "FINDING_TARGET_UNBOUND";
    case "ALTERNATIVE_PATH": {
      if (!ref || (side !== "REFERENCE" && side !== "STUDENT")) return "FINDING_TARGET_SHAPE";
      const pool = side === "REFERENCE" ? detail.reference_path_ids : detail.student_path_ids;
      return pool.includes(ref) ? null : "FINDING_TARGET_UNBOUND";
    }
    default:
      return "FINDING_TARGET_SHAPE";
  }
}

export function validateHqMathJudgment(
  judgment: HqMathJudgment,
  detail: MathQualityCaseDetail,
): HqWriteValidation {
  const issues = new Set<HqWriteCode>();

  if (judgment.dto_version !== HQ_MATH_WRITE_DTO) issues.add("UNKNOWN_WRITE_DTO");
  if (judgment.rubric_version !== HQ_MATH_RUBRIC_VERSION) issues.add("UNKNOWN_RUBRIC_VERSION");
  if (!judgment.reference_context_reviewed) issues.add("REFERENCE_CONTEXT_NOT_REVIEWED");

  // Output-hash binding: the judgment must pin the exact reviewed output (MATH-7A §20).
  if (judgment.expected_output_sha256 !== detail.output_sha256) issues.add("STALE_OUTPUT_HASH");

  // All 11 dimensions present with valid verdicts; conditional NA iff artifact absent.
  const na = requiredNa(detail);
  for (const dim of HQ_MATH_DIMENSIONS) {
    const verdict = judgment.rubric_result[dim];
    if (verdict === undefined) {
      issues.add("MISSING_DIMENSION");
      continue;
    }
    if (!VERDICTS.has(verdict)) issues.add("INVALID_VERDICT");
    const isConditional = HQ_CONDITIONAL_DIMENSIONS.includes(dim);
    if (isConditional) {
      if (na.has(dim) && verdict !== "NA") issues.add("CONDITIONAL_NA_REQUIRED");
      if (!na.has(dim) && verdict === "NA") issues.add("CONDITIONAL_NA_FORBIDDEN");
    }
  }

  // Finding targets bind to canonical ids of the reviewed case.
  for (const finding of judgment.findings) {
    const code = validateTarget(finding, detail);
    if (code) issues.add(code);
  }

  // Disposition ↔ verdict/finding consistency.
  const verdicts = HQ_MATH_DIMENSIONS.map((d) => judgment.rubric_result[d]);
  const anyFail = verdicts.includes("FAIL");
  const anyConcern = verdicts.includes("CONCERN");
  const hasFindings = judgment.findings.length > 0;
  const nonMinorFinding = judgment.findings.some((f) => f.severity !== "MINOR");

  if (judgment.overall_disposition === "PASS") {
    if (anyFail || anyConcern || hasFindings) issues.add("DISPOSITION_PASS_REQUIRES_CLEAN");
  } else if (judgment.overall_disposition === "PASS_WITH_NOTES") {
    if (anyFail || nonMinorFinding) issues.add("DISPOSITION_NOTES_REQUIRES_MINOR");
  }
  // NEEDS_REVIEW / FAIL: unrestricted.

  return { ok: issues.size === 0, issues: [...issues] };
}
