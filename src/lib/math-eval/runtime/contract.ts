/**
 * MATH-4B — math_evaluation runtime binding types (worker-only, dto math-worker-v1). Exact actions
 * and payload keys read from MATH-2D (`math_evaluation`): claim {evaluation_id}; finalize
 * {evaluation_id, lease_token, output}; fail {evaluation_id, lease_token, error_code}. Finalize
 * output is the strict math-eval-v1 from MATH-2C (see ../types MathEvalOutput). Provenance:
 * APP 17e528b, migration 20261002000200 (SHA b40bf72…).
 */

import type { MathEvalOutput, ReferenceProvenance } from "../types";

export const MATH_WORKER_DTO = "math-worker-v1" as const;

export type MathEvaluationAction = "claim" | "finalize" | "fail";
export type EvalErrorCode = "TIMEOUT" | "INVALID_OUTPUT" | "PROCESSING_FAILED" | "ACCOUNT_ERASURE";

export interface ClaimEvalPayload {
  evaluation_id: string;
}

/** Pinned claim context (attempt/leaf/problem/profile/extraction/criteria/sources/solutions). */
export interface ClaimContext {
  attempt: { attempt_id: string; kind: string; input_kind: string; prior_evaluation_id: string | null };
  leaf: { id: string; response_format: string };
  profile: { requires_reasoning: boolean };
  selected_extraction_id: string;
  extraction_region_ids: string[];
  criteria: Array<{ criterion_id: string; max_points: number | null }>;
  solutions: Array<{ id: string; provenance: ReferenceProvenance }>;
}
export interface ClaimEvalResult {
  evaluation_id: string;
  lease_token: string;
  lease_until: string;
  context: ClaimContext;
}

export interface FinalizeEvalPayload {
  evaluation_id: string;
  lease_token: string;
  output: MathEvalOutput;
}
/** math_finalize_evaluation returns the evaluation uuid. */
export type FinalizeEvalResult = string;

export interface FailEvalPayload {
  evaluation_id: string;
  lease_token: string;
  error_code: EvalErrorCode;
}
export interface FailEvalResult {
  failed: boolean;
}
