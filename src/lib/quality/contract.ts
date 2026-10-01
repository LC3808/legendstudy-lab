import { QualityError } from "./errors";

/**
 * `ql-read-v1` CONSUMER REPRESENTATION.
 *
 * These types describe how LAB *reads* the deployed canonical Quality contract.
 * They are NOT the Shared Backend schema and NOT canonical DB facts (task §34):
 *   - TypeScript DTO            ≠ DB schema authority
 *   - UI ViewModel              ≠ Essay canonical fact
 *   - Formatted display status  ≠ canonical lifecycle value
 *
 * Field names follow the canonical contract (task brief §4–§5). Sub-shapes that
 * the contract does not fully enumerate are typed optional/nullable and read
 * defensively, so an unknown extra field is ignored (never inferred) and a
 * missing optional field never throws. Only the envelope and `dto_version` are
 * validated strictly — everything else preserves `[]` vs `null` vs *absent*.
 */

export const QUALITY_DTO_VERSION = "ql-read-v1" as const;
export type QualityDtoVersion = typeof QUALITY_DTO_VERSION;

/** Paired keyset cursor: `requested_at` + `evaluation_id` (never a bare offset). */
export interface QualityListCursor {
  requested_at: string;
  evaluation_id: string;
}

/** One row of `ql_list_cases`. No student answer body ever appears here. */
export interface QualityCaseSummary {
  evaluation_id: string;
  attempt_id?: string | null;
  question_id?: string | null;
  university_name?: string | null;
  exam_name?: string | null;
  admission_year?: number | null;
  question_label?: string | null;
  requested_at?: string | null;
  completed_at?: string | null;
  submitted_at?: string | null;
  status?: string | null;
  request_kind?: string | null;
  invalidated_at?: string | null;
  model_provider?: string | null;
  model_name?: string | null;
  prompt_version?: string | null;
  contract_version?: string | null;
  evaluation_version?: string | null;
  regime_key?: string | null;
  evidence_manifest_sha256?: string | null;
  core_count?: number | null;
  has_generated_rewrite?: boolean | null;
  has_subsequent_student_attempt?: boolean | null;
  processing_outcome?: string | null;
  student_pseudonym?: string | null;
}

export interface QualityListPage {
  dtoVersion: QualityDtoVersion;
  cases: QualityCaseSummary[];
  nextCursor: QualityListCursor | null;
}

// ── Detail group sub-shapes (all optional/nullable; defensive) ───────────────

export interface QualityQuestionContext {
  question_id?: string | null;
  question_label?: string | null;
  university?: string | null;
  exam_name?: string | null;
  admission_year?: number | null;
  campus?: string | null;
  admission_track?: string | null;
  verification_status?: string | null;
  [key: string]: unknown;
}

export interface QualityStudentSubmission {
  attempt_id?: string | null;
  attempt_no?: number | null;
  submitted_at?: string | null;
  character_count?: number | null;
  input_method?: string | null;
  /** Full student answer. Detail-only; never present in the list. */
  answer_full_text?: string | null;
  [key: string]: unknown;
}

export interface QualityEvaluationSummary {
  status?: string | null;
  request_kind?: string | null;
  supersedes_evaluation_id?: string | null;
  correction_reason?: string | null;
  invalidated_at?: string | null;
  invalidation_reason?: string | null;
  overall_summary?: string | null;
  strengths?: string[] | null;
  rewrite_checklist?: string[] | null;
  uncertainty_note?: string | null;
  requested_at?: string | null;
  completed_at?: string | null;
  [key: string]: unknown;
}

export interface QualityDimension {
  /** `essay_evaluation_dimensions.id` — used as a finding target (DIMENSION). */
  dimension_id?: string | null;
  criterion_id?: string | null;
  criterion_key?: string | null;
  criterion_label?: string | null;
  origin?: string | null;
  official_weight_percent?: number | null;
  level_1_to_5?: number | null;
  explanation?: string | null;
  uncertainty_note?: string | null;
  [key: string]: unknown;
}

export interface QualityImprovement {
  progress_id?: string | null;
  previous_progress_id?: string | null;
  issue_key?: string | null;
  category?: string | null;
  status?: string | null;
  title?: string | null;
  explanation?: string | null;
  next_action?: string | null;
  priority?: number | null;
  /**
   * CORE membership. The deployed `ql_case_detail` exposes `is_core` (derived
   * server-side as active progress with `core_focus=true`); older fixtures used a
   * bare `core_focus`. Both are accepted; `is_core` is preferred. Priority is
   * ordering, NOT membership — never infer CORE from priority/category/count.
   */
  is_core?: boolean | null;
  core_focus?: boolean | null;
  /** Versioned sentence/scaffolding observation linked to this progress. */
  scaffolding_observation?: unknown;
  [key: string]: unknown;
}

export interface QualityGeneratedRewrite {
  status?: string | null;
  /** Always an AI origin (e.g. `ai_generated`); distinct from a student rewrite. */
  origin?: string | null;
  body?: string | null;
  completed_at?: string | null;
  [key: string]: unknown;
}

export interface QualityStudentAttempt {
  attempt_id?: string | null;
  attempt_no?: number | null;
  submitted_at?: string | null;
  character_count?: number | null;
  is_rewrite?: boolean | null;
  [key: string]: unknown;
}

export interface QualityProvenance {
  model_provider?: string | null;
  model_name?: string | null;
  model_version?: string | null;
  prompt_version?: string | null;
  contract_version?: string | null;
  evaluation_version?: string | null;
  regime_key?: string | null;
  evidence_completeness?: string | null;
  evidence_manifest_sha256?: string | null;
  input_sha256?: string | null;
  output_sha256?: string | null;
  [key: string]: unknown;
}

export interface QualityProcessing {
  run_no?: number | null;
  provider?: string | null;
  model_name?: string | null;
  status?: string | null;
  latency_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cost_amount?: number | null;
  currency?: string | null;
  error_code?: string | null;
  timed_out_at?: string | null;
  [key: string]: unknown;
}

export interface QualitySessionEvaluation {
  evaluation_id?: string | null;
  attempt_id?: string | null;
  status?: string | null;
  requested_at?: string | null;
  [key: string]: unknown;
}

/**
 * Full `ql_case_detail` body. Every group is optional/nullable so that `null`
 * (unavailable) stays distinguishable from `[]` (empty) and from *absent*. The
 * UI renders explicit "unavailable" vs "none" states accordingly.
 */
export interface QualityCaseDetail {
  evaluation_id: string;
  dto_version?: string | null;
  question_context?: QualityQuestionContext | null;
  student_submission?: QualityStudentSubmission | null;
  student_pseudonym?: string | null;
  evaluation?: QualityEvaluationSummary | null;
  dimensions?: QualityDimension[] | null;
  improvements?: QualityImprovement[] | null;
  scaffolding_availability?: unknown;
  core_improvement_keys?: string[] | null;
  sentence_feedback?: unknown;
  history_context?: unknown;
  previous_review_representation?: unknown;
  official_evidence?: unknown[] | null;
  evaluation_evidence_links?: unknown[] | null;
  frozen_evidence_bindings?: unknown;
  frozen_criterion_bindings?: unknown;
  reference_metadata_scope?: unknown;
  student_attempts?: QualityStudentAttempt[] | null;
  attempt_window?: unknown;
  generated_rewrite?: QualityGeneratedRewrite | null;
  provenance?: QualityProvenance | null;
  processing?: QualityProcessing | null;
  latest_processing?: QualityProcessing | null;
  session_evaluations?: QualitySessionEvaluation[] | null;
  session_evaluations_truncated?: boolean | null;
  [key: string]: unknown;
}

// ── Parsing / validation ─────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate the `dto_version` field. Strict and fail-closed: a value that is
 * present but not exactly `ql-read-v1` is UNSUPPORTED_DTO. When `required` is
 * true (the list envelope), a missing/empty version is also rejected.
 */
function assertDtoVersion(value: unknown, required: boolean): void {
  if (value === undefined || value === null) {
    if (required) throw new QualityError("UNSUPPORTED_DTO", "missing dto_version");
    return;
  }
  if (value !== QUALITY_DTO_VERSION) {
    throw new QualityError("UNSUPPORTED_DTO", "unsupported dto_version");
  }
}

function parseCursor(value: unknown): QualityListCursor | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new QualityError("MALFORMED_RESPONSE", "invalid cursor");
  const requestedAt = value.requested_at;
  const evaluationId = value.evaluation_id;
  if (typeof requestedAt !== "string" || typeof evaluationId !== "string") {
    throw new QualityError("MALFORMED_RESPONSE", "invalid cursor fields");
  }
  // Preserve the paired cursor exactly; do not reshape or drop either half.
  return { requested_at: requestedAt, evaluation_id: evaluationId };
}

/**
 * Parse the `ql_list_cases` envelope. Strict on the envelope shape and version;
 * each case row is passed through defensively (requiring only a string
 * `evaluation_id` as the structural anchor).
 */
export function parseListEnvelope(raw: unknown): QualityListPage {
  if (!isRecord(raw)) throw new QualityError("MALFORMED_RESPONSE", "list envelope not an object");
  assertDtoVersion(raw.dto_version, true);

  const cases = raw.cases;
  if (!Array.isArray(cases)) throw new QualityError("MALFORMED_RESPONSE", "cases not an array");

  const parsedCases: QualityCaseSummary[] = cases.map((entry) => {
    if (!isRecord(entry) || typeof entry.evaluation_id !== "string") {
      throw new QualityError("MALFORMED_RESPONSE", "case row missing evaluation_id");
    }
    // Trust the contract field set; preserve nullable values without coercion.
    return entry as unknown as QualityCaseSummary;
  });

  return {
    dtoVersion: QUALITY_DTO_VERSION,
    cases: parsedCases,
    nextCursor: parseCursor(raw.next_cursor),
  };
}

/**
 * Parse a `ql_case_detail` body. `dto_version` is validated when present
 * (fail-closed on mismatch) but not required, since the case id was already
 * obtained through a version-validated list. `evaluation_id` is the required
 * structural anchor.
 */
export function parseCaseDetail(raw: unknown): QualityCaseDetail {
  if (!isRecord(raw)) throw new QualityError("MALFORMED_RESPONSE", "detail not an object");
  assertDtoVersion(raw.dto_version, false);
  if (typeof raw.evaluation_id !== "string") {
    throw new QualityError("MALFORMED_RESPONSE", "detail missing evaluation_id");
  }
  return raw as unknown as QualityCaseDetail;
}
