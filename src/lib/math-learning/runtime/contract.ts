/**
 * MATH-5B-R — canonical MATH-2E learning runtime contract (`math_learning`, dto math-learning-v1).
 * Replaces the provisional MATH-5B reveal path and the in-memory SolutionRevealRepository.
 *
 * Provenance (authority; read-only, not duplicated as SQL):
 *   APP commit:        cd215a6d88c0f72e59d06478bf4727ed676ca5f9
 *   migration:         supabase/migrations/20261002000300_math_learning_runtime.sql
 *   SHA-256:           fa0fbb507dd650d2e684f7dc9bc9375c6c5db09eac64405a438ad63206933f7d
 *   contract:          supabase/verification/math_essay/learning/contract.md
 *
 * Transport: `rpc('math_learning', { p_request: {dto_version, action, payload} })`. Server derives
 * owner from auth.uid(); the client supplies no owner/eligibility/completion/price authority. Null is
 * "unavailable/not recorded", never a fabricated zero. READY/availability/eligibility/expiry are
 * server-authoritative; the client never recomputes the 336-hour window.
 */

import type { HintLevel } from "../types";

export const MATH_LEARNING_DTO = "math-learning-v1" as const;

export type MathLearningAction =
  | "read_learning_state"
  | "reveal_hint"
  | "reveal_solution"
  | "create_resolve_attempt"
  | "request_reevaluation"
  | "read_learning_history";

export type SolutionTarget = "REFERENCE" | "GENERATED";
export type SolutionProvenance =
  | "OFFICIAL_SOLUTION"
  | "VERIFIED_INTERNAL_SOLUTION"
  | "AI_GENERATED_REFERENCE";
export type IncludedReevaluationStatus =
  | "AVAILABLE"
  | "AUTHORIZED_PENDING"
  | "CONSUMED"
  | "EXPIRED"
  | "UNAVAILABLE";

/* --------------------------------------------------- payloads */

export interface ReadLearningStatePayload {
  evaluation_id: string;
}
export interface RevealHintPayload {
  evaluation_id: string;
  hint_id: string;
  level: HintLevel;
  client_submission_id: string;
}
export interface RevealSolutionPayload {
  evaluation_id: string;
  target: SolutionTarget;
  client_submission_id: string;
  /** Required for REFERENCE; omitted/null for GENERATED. */
  solution_id?: string | null;
}
export interface ReadLearningHistoryPayload {
  evaluation_id: string;
  limit?: number;
  before_at?: string;
  before_id?: string;
}

export type ResolveKind = "STEP_RETRY" | "FULL_RESOLVE" | "SHORT_ANSWER_RESOLVE";
export type ResolveInputKind = "TYPED" | "EVIDENCE" | "MIXED";

export interface CreateResolveAttemptPayload {
  client_submission_id: string;
  leaf_id: string;
  kind: ResolveKind;
  predecessor_id: string;
  prior_evaluation_id: string;
  input_kind: ResolveInputKind;
  /** Actual TYPED/MIXED work (≤30000 chars). */
  typed_answer?: string;
  /** Required for STEP_RETRY; omitted/null otherwise. */
  target_step_id?: string | null;
}
export interface CreateResolveAttemptResult {
  attempt_id: string;
}

export interface RequestReevaluationPayload {
  attempt_id: string;
  client_submission_id: string;
}
/** Included-only; the runtime never auto-falls back to the paid route. */
export interface RequestReevaluationResult {
  evaluation_id: string;
  commercial_context: "INCLUDED_REEVALUATION";
  additional_credit: 0;
}

/* --------------------------------------------------- reevaluation delta (MATH-4 worker extension) */

export type ReevaluationDeltaKind =
  | "CORE_CORRECTED"
  | "ROOT_ERROR_REMOVED"
  | "ROOT_ERROR_REMAINS"
  | "PROPAGATED_ERROR_REMOVED"
  | "NEW_INDEPENDENT_ERROR"
  | "ANSWER_CHANGED"
  | "ANSWER_NOW_CORRECT"
  | "JUSTIFICATION_IMPROVED"
  | "NO_MATERIAL_CHANGE"
  | "PATH_VALIDITY_CHANGED";

export interface ReevaluationDeltaItem {
  kind: ReevaluationDeltaKind;
  explanation: string;
  prior_error_id?: string;
  current_error_id?: string;
}
export interface ReevaluationDelta {
  prior_evaluation_id: string;
  target_step_id: string | null;
  downstream: "NOT_REASSESSED" | null;
  summary: string;
  delta?: ReevaluationDeltaItem[];
}

export interface LearningHistoryEntry {
  attempt_id: string;
  created_at: string;
  resolve_kind: string;
  prior_attempt_id: string | null;
  prior_evaluation_id: string | null;
  target_step_id: string | null;
  submitted_scope: "TARGET_STEP" | "WHOLE_LEAF";
  evaluation_id: string | null;
  evaluation_state: string | null;
  completed_at: string | null;
  reevaluation_delta: ReevaluationDelta | null;
  core_ids: string[];
  exposed_hint_levels: number[];
  solution_revealed: boolean;
  reference_solution_revealed_before_resolve: boolean;
}
export interface LearningHistoryResult {
  lineage_id: string;
  attempts: LearningHistoryEntry[];
  included_reevaluation: IncludedReevaluation;
  next_cursor: { created_at: string; attempt_id: string } | null;
}

/* --------------------------------------------------- results */

export interface IncludedReevaluation {
  status: IncludedReevaluationStatus;
  eligible: boolean;
  included_count: 1;
  initial_evaluation_id: string | null;
  /** Initial valid completion + exactly 336h; server authority — never recomputed client-side. */
  expires_at: string | null;
  as_of: string;
  request_route: string;
}

export interface LearningStateCore {
  core_id: string;
  position: number;
  error_id: string | null;
  step_id: string | null;
  title: string;
  diagnosis: string;
  why: string;
  next_action: string;
}
export interface LearningStateHint {
  hint_id: string;
  core_id: string;
  level: HintLevel;
  available: boolean;
  revealed: boolean;
  can_reveal: boolean;
  /** No body in state — bodies come only through reveal_hint. */
}
export interface LearningStateSolution {
  solution_id: string | null;
  target: SolutionTarget;
  provenance: SolutionProvenance;
  physical_origin: string;
  reveal_state: "AVAILABLE_ON_EXPLICIT_REQUEST" | "UNAVAILABLE";
  revealed: boolean;
}

export interface LearningState {
  evaluation_id: string;
  attempt_id: string;
  lineage_id: string;
  problem_id: string;
  leaf_id: string;
  response_format: "SHORT_ANSWER" | "SHORT_REASONING" | "FULL_SOLUTION" | "PROOF";
  resolve_kind: string;
  prior_attempt_id: string | null;
  prior_evaluation_id: string | null;
  target_step_id: string | null;
  submitted_scope: "TARGET_STEP" | "WHOLE_LEAF";
  downstream: "NOT_REASSESSED" | null;
  evaluation_state: string;
  completed_at: string | null;
  valid_evaluation_available: boolean;
  review_status: "NOT_RECORDED" | "NOT_REQUIRED" | "HUMAN_REVIEW_REQUIRED";
  core: LearningStateCore[];
  hints: LearningStateHint[];
  hint_availability: "NOT_APPLICABLE" | "UNAVAILABLE" | "FROM_FROZEN_HINTS";
  solutions: LearningStateSolution[];
  resolve_kinds: string[];
  included_reevaluation: IncludedReevaluation;
  reevaluation_delta: unknown | null;
  reference_solution_revealed_before_resolve: boolean;
  hint_levels_before_resolve: number[];
}

export interface RevealHintResult {
  hint_id: string;
  level: HintLevel;
  body: string;
  replayed?: boolean;
}
export interface RevealSolutionResult {
  exposure_id: string;
  evaluation_id: string;
  solution_id: string | null;
  target: SolutionTarget;
  delivered_at: string;
  provenance: SolutionProvenance;
  physical_origin: string;
  body: string;
  learning_context: "REFERENCE_SOLUTION_REVEALED";
  replayed?: boolean;
}
