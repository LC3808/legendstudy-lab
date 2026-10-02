/**
 * MATH-5B-R — student-facing learning runtime client (browser-safe). Wraps the canonical MATH-2E
 * `math_learning` RPC: read_learning_state (server-authoritative), reveal_hint, reveal_solution.
 * Server derives owner; no worker credential, no direct DB write, no Credit, no client eligibility/
 * expiry computation. (create_resolve_attempt / request_reevaluation are MATH-6B, not bound here.)
 */

import { callRuntime, type MathRpcTransport } from "../../math-input/runtime/transport";
import {
  MATH_LEARNING_DTO,
  type CreateResolveAttemptPayload,
  type CreateResolveAttemptResult,
  type LearningHistoryResult,
  type LearningState,
  type RequestReevaluationResult,
  type RevealHintResult,
  type RevealSolutionResult,
  type SolutionTarget,
} from "./contract";
import type { HintLevel } from "../types";

export class LearningRuntimeClient {
  constructor(private readonly transport: MathRpcTransport) {}

  /** Canonical, server-authoritative learning state (hint availability, solution/eligibility state). */
  readLearningState(evaluationId: string): Promise<LearningState> {
    return callRuntime<LearningState>(this.transport, "math_learning", MATH_LEARNING_DTO, "read_learning_state", {
      evaluation_id: evaluationId,
    });
  }

  /** Gated hint reveal (L1/L2 bodies). Server enforces gating + idempotency + no Credit. */
  revealHint(
    evaluationId: string,
    hintId: string,
    level: HintLevel,
    clientSubmissionId: string,
  ): Promise<RevealHintResult> {
    return callRuntime<RevealHintResult>(this.transport, "math_learning", MATH_LEARNING_DTO, "reveal_hint", {
      evaluation_id: evaluationId,
      hint_id: hintId,
      level,
      client_submission_id: clientSubmissionId,
    });
  }

  /** HYBRID solution reveal. Provenance is server-authored; no Credit/score/attempt side effect. */
  revealSolution(
    evaluationId: string,
    target: SolutionTarget,
    clientSubmissionId: string,
    solutionId?: string | null,
  ): Promise<RevealSolutionResult> {
    const payload: Record<string, unknown> = {
      evaluation_id: evaluationId,
      target,
      client_submission_id: clientSubmissionId,
    };
    if (target === "REFERENCE") payload.solution_id = solutionId ?? null;
    return callRuntime<RevealSolutionResult>(this.transport, "math_learning", MATH_LEARNING_DTO, "reveal_solution", payload);
  }

  /** Create a new immutable re-solve attempt (server owns lineage/eligibility/sequence). */
  createResolveAttempt(payload: CreateResolveAttemptPayload): Promise<CreateResolveAttemptResult> {
    return callRuntime<CreateResolveAttemptResult>(this.transport, "math_learning", MATH_LEARNING_DTO, "create_resolve_attempt", {
      ...payload,
    });
  }

  /** Included-only reevaluation request; server decides eligibility (no client paid fallback). */
  requestReevaluation(attemptId: string, clientSubmissionId: string): Promise<RequestReevaluationResult> {
    return callRuntime<RequestReevaluationResult>(this.transport, "math_learning", MATH_LEARNING_DTO, "request_reevaluation", {
      attempt_id: attemptId,
      client_submission_id: clientSubmissionId,
    });
  }

  /** Append-only learning history (server pagination). */
  readLearningHistory(
    evaluationId: string,
    options: { limit?: number; beforeAt?: string; beforeId?: string } = {},
  ): Promise<LearningHistoryResult> {
    const payload: Record<string, unknown> = { evaluation_id: evaluationId };
    if (options.limit !== undefined) payload.limit = options.limit;
    if (options.beforeAt !== undefined && options.beforeId !== undefined) {
      payload.before_at = options.beforeAt;
      payload.before_id = options.beforeId;
    }
    return callRuntime<LearningHistoryResult>(this.transport, "math_learning", MATH_LEARNING_DTO, "read_learning_history", payload);
  }
}
