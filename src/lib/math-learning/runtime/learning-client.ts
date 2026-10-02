/**
 * MATH-5B-R — student-facing learning runtime client (browser-safe). Wraps the canonical MATH-2E
 * `math_learning` RPC: read_learning_state (server-authoritative), reveal_hint, reveal_solution.
 * Server derives owner; no worker credential, no direct DB write, no Credit, no client eligibility/
 * expiry computation. (create_resolve_attempt / request_reevaluation are MATH-6B, not bound here.)
 */

import { callRuntime, type MathRpcTransport } from "../../math-input/runtime/transport";
import {
  MATH_LEARNING_DTO,
  type LearningState,
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
}
