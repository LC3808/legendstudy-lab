import { HumanReviewError } from "./human-review-errors";

/**
 * Human Quality (HQP) CONSUMER REPRESENTATION — `hq-read-v1` / `hq-write-v1`.
 *
 * Field names, enums and shapes are copied from the deployed canonical migration
 * `20261001000200_human_quality_persistence.sql` (APP `codex/essay-scaffolding-vnext`).
 * These are consumer types, not DB authority. The server is the sole authority on
 * validation; LAB mirrors only what it needs for UX.
 */

export const HQ_WRITE_DTO_VERSION = "hq-write-v1" as const;
export const HQ_READ_DTO_VERSION = "hq-read-v1" as const;
export const HQ_RUBRIC_VERSION = "hq-rubric-v1" as const;

export const HQ_DISPOSITIONS = ["PASS", "PASS_WITH_NOTES", "NEEDS_REVIEW", "FAIL"] as const;
export type HqDisposition = (typeof HQ_DISPOSITIONS)[number];

export const HQ_VERDICTS = ["OK", "CONCERN", "FAIL", "NA"] as const;
export type HqVerdict = (typeof HQ_VERDICTS)[number];

/** Required rubric dimensions (verdict OK/CONCERN/FAIL). */
export const HQ_REQUIRED_DIMENSIONS = [
  "diagnosis",
  "core_priority",
  "actionability",
  "evidence_adherence",
  "stance_preservation",
  "hallucination_absence",
] as const;
/** Conditional rubric dimensions (verdict OK/CONCERN/FAIL/NA). */
export const HQ_CONDITIONAL_DIMENSIONS = ["sentence_feedback", "progression", "generated_rewrite"] as const;
export const HQ_ALL_DIMENSIONS = [...HQ_REQUIRED_DIMENSIONS, ...HQ_CONDITIONAL_DIMENSIONS] as const;
export type HqDimensionKey = (typeof HQ_ALL_DIMENSIONS)[number];
/** Blocking dimensions: a FAIL here blocks PASS/PASS_WITH_NOTES (mirrored for UX). */
export const HQ_BLOCKING_DIMENSIONS = ["diagnosis", "hallucination_absence"] as const;

export type HqRubricResult = Record<HqDimensionKey, HqVerdict>;

export const HQ_SELECTION_REASONS = [
  "EARLY_CENSUS",
  "RANDOM_SAMPLE",
  "ANOMALY",
  "USER_REPORT",
  "OPERATOR_REQUEST",
  "MODEL_CHANGE_AUDIT",
  "DISPUTE",
  "OTHER",
] as const;
export type HqSelectionReason = (typeof HQ_SELECTION_REASONS)[number];

export const HQ_RECOMMENDED_ACTIONS = [
  "NONE",
  "MONITOR",
  "REVIEW_PROMPT",
  "REVIEW_EVIDENCE",
  "RE_EVALUATE",
  "INVALIDATE_CANDIDATE",
  "ESCALATE",
] as const;
export type HqRecommendedAction = (typeof HQ_RECOMMENDED_ACTIONS)[number];

export const HQ_ISSUE_CATEGORIES = [
  "FALSE_CORRECTION",
  "INVENTED_ERROR",
  "EVIDENCE_MISREAD",
  "UNSUPPORTED_CLAIM",
  "STANCE_CHANGE",
  "CORE_PRIORITY_ERROR",
  "SENTENCE_SPAN_ERROR",
  "PROGRESSION_ERROR",
  "OVER_REWRITE",
  "UNDER_SPECIFIED_GUIDANCE",
  "MISSING_IMPORTANT_ISSUE",
  "OTHER",
] as const;
export type HqIssueCategory = (typeof HQ_ISSUE_CATEGORIES)[number];

export const HQ_SEVERITIES = ["MINOR", "MATERIAL", "CRITICAL"] as const;
export type HqSeverity = (typeof HQ_SEVERITIES)[number];

export const HQ_TARGET_KINDS = [
  "OVERALL",
  "DIMENSION",
  "PROGRESS",
  "ISSUE_KEY",
  "SENTENCE",
  "EVIDENCE_LINK",
  "GENERATED_REWRITE",
] as const;
export type HqTargetKind = (typeof HQ_TARGET_KINDS)[number];

/** target_ref shapes keyed by target_kind (OVERALL / GENERATED_REWRITE use null). */
export type HqTargetRef =
  | null
  | { dimension_id: string }
  | { progress_id: string }
  | { issue_key: string }
  | { progress_id: string; observation_key: string }
  | { evidence_id: string; dimension_id: string | null; progress_id: string | null };

export interface HqFindingInput {
  issue_category: HqIssueCategory;
  severity: HqSeverity;
  target_kind: HqTargetKind;
  target_ref: HqTargetRef;
  note?: string | null;
}

/** Full write payload sent to `ql_submit_human_judgment`. */
export interface HqSubmitPayload {
  dto_version: typeof HQ_WRITE_DTO_VERSION;
  evaluation_id: string;
  expected_output_sha256: string;
  client_submission_id: string;
  rubric_version: typeof HQ_RUBRIC_VERSION;
  overall_disposition: HqDisposition;
  rubric_result: HqRubricResult;
  findings: HqFindingInput[];
  official_source_reviewed: true;
  summary_note: string | null;
  selection_reason: HqSelectionReason;
  recommended_action: HqRecommendedAction;
  supersedes_judgment_id?: string | null;
}

export interface HqSubmitResult {
  dtoVersion: typeof HQ_WRITE_DTO_VERSION;
  judgmentId: string;
  replayed: boolean;
}

// ── review-state (ql_review_state) ───────────────────────────────────────────

export const HQ_REVIEW_STATES = [
  "UNREVIEWED",
  "REVIEWED_ACCEPTABLE",
  "REVIEWED_WITH_CONCERNS",
  "REVIEWED_FAILED",
  "MULTIPLE_REVIEWS",
  "DISAGREEMENT",
] as const;
export type HqReviewState = (typeof HQ_REVIEW_STATES)[number];

export interface HqCaseReviewState {
  evaluation_id: string;
  availability: "AVAILABLE" | "NOT_FOUND";
  human_review_state?: HqReviewState | null;
  active_count?: number | null;
  total_count?: number | null;
  latest_human_reviewed_at?: string | null;
  has_material_issue?: boolean | null;
  comparison_status?: "COMPARABLE" | "NOT_COMPARABLE" | null;
  consensus_bucket?: string | null;
}

// ── judgment history (ql_list_human_judgments) ───────────────────────────────

export interface HqFinding {
  id?: string | null;
  issue_category?: string | null;
  severity?: string | null;
  target_kind?: string | null;
  target_ref?: unknown;
  note?: string | null;
  [key: string]: unknown;
}

export interface HqJudgment {
  id: string;
  evaluation_id?: string | null;
  reviewed_output_sha256?: string | null;
  reviewed_generated_rewrite_id?: string | null;
  reviewer_user_id?: string | null;
  reviewer_state?: "AVAILABLE" | "DELETED_OR_UNAVAILABLE" | null;
  is_active?: boolean | null;
  rubric_version?: string | null;
  overall_disposition?: string | null;
  rubric_result?: Partial<Record<string, string>> | null;
  selection_reason?: string | null;
  recommended_action?: string | null;
  summary_note?: string | null;
  supersedes_judgment_id?: string | null;
  created_at?: string | null;
  findings?: HqFinding[] | null;
  [key: string]: unknown;
}

export interface HqJudgmentCursor {
  created_at: string;
  judgment_id: string;
}

export interface HqJudgmentPage {
  dtoVersion: typeof HQ_READ_DTO_VERSION;
  judgments: HqJudgment[];
  nextCursor: HqJudgmentCursor | null;
}

// ── parsing / validation ─────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertReadDto(raw: Record<string, unknown>): void {
  if (raw.dto_version !== HQ_READ_DTO_VERSION) {
    throw new HumanReviewError("UNSUPPORTED_RUBRIC", "unsupported hq-read dto_version");
  }
}

export function parseReviewState(raw: unknown): HqCaseReviewState[] {
  if (!isRecord(raw)) throw new HumanReviewError("MALFORMED_RESPONSE", "review-state not an object");
  assertReadDto(raw);
  const cases = raw.cases;
  if (!Array.isArray(cases)) throw new HumanReviewError("MALFORMED_RESPONSE", "cases not an array");
  return cases.map((entry) => {
    if (!isRecord(entry) || typeof entry.evaluation_id !== "string") {
      throw new HumanReviewError("MALFORMED_RESPONSE", "review-state row missing evaluation_id");
    }
    return entry as unknown as HqCaseReviewState;
  });
}

export function parseJudgmentPage(raw: unknown): HqJudgmentPage {
  if (!isRecord(raw)) throw new HumanReviewError("MALFORMED_RESPONSE", "judgment page not an object");
  assertReadDto(raw);
  const judgments = raw.judgments;
  if (!Array.isArray(judgments)) throw new HumanReviewError("MALFORMED_RESPONSE", "judgments not an array");
  const parsed = judgments.map((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string") {
      throw new HumanReviewError("MALFORMED_RESPONSE", "judgment missing id");
    }
    return entry as unknown as HqJudgment;
  });
  let nextCursor: HqJudgmentCursor | null = null;
  const cursor = raw.next_cursor;
  if (cursor !== null && cursor !== undefined) {
    if (!isRecord(cursor) || typeof cursor.created_at !== "string" || typeof cursor.judgment_id !== "string") {
      throw new HumanReviewError("MALFORMED_RESPONSE", "invalid judgment cursor");
    }
    nextCursor = { created_at: cursor.created_at, judgment_id: cursor.judgment_id };
  }
  return { dtoVersion: HQ_READ_DTO_VERSION, judgments: parsed, nextCursor };
}

export function parseSubmitResult(raw: unknown): HqSubmitResult {
  if (!isRecord(raw) || typeof raw.judgment_id !== "string") {
    throw new HumanReviewError("MALFORMED_RESPONSE", "submit result missing judgment_id");
  }
  if (raw.dto_version !== HQ_WRITE_DTO_VERSION) {
    throw new HumanReviewError("UNSUPPORTED_RUBRIC", "unsupported hq-write dto_version");
  }
  return { dtoVersion: HQ_WRITE_DTO_VERSION, judgmentId: raw.judgment_id, replayed: raw.replayed === true };
}
