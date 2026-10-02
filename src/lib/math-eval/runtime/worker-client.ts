/**
 * MATH-4B — WORKER-ONLY evaluation client + flow. Wraps math_evaluation (claim/finalize/fail), which
 * MATH-2D restricts to the trusted evaluation worker role. Never imported by a student browser
 * component. The student cannot finalize its own evaluation.
 *
 * runWorkerEvaluation enforces LAB fail-closed atomicity (MATH-4A §40/§23): it validates the
 * candidate BEFORE finalize and FAILS the run on invalid output — never a partial "completed" publish.
 */

import { callRuntime, type MathRpcTransport } from "../../math-input/runtime/transport";
import { validateMathEval, type MathEvaluationValidation } from "../validation";
import {
  MATH_WORKER_DTO,
  type ClaimContext,
  type ClaimEvalResult,
  type EvalErrorCode,
  type FailEvalResult,
  type FinalizeEvalResult,
} from "./contract";
import type { MathEvaluationInput, MathEvaluatorAdapter, MathResponseFormat } from "../types";

export class MathEvaluationWorkerClient {
  constructor(private readonly transport: MathRpcTransport) {}

  claim(evaluationId: string): Promise<ClaimEvalResult> {
    return callRuntime<ClaimEvalResult>(this.transport, "math_evaluation", MATH_WORKER_DTO, "claim", {
      evaluation_id: evaluationId,
    });
  }

  finalize(evaluationId: string, leaseToken: string, output: unknown): Promise<FinalizeEvalResult> {
    return callRuntime<FinalizeEvalResult>(this.transport, "math_evaluation", MATH_WORKER_DTO, "finalize", {
      evaluation_id: evaluationId,
      lease_token: leaseToken,
      output,
    });
  }

  fail(evaluationId: string, leaseToken: string, errorCode: EvalErrorCode): Promise<FailEvalResult> {
    return callRuntime<FailEvalResult>(this.transport, "math_evaluation", MATH_WORKER_DTO, "fail", {
      evaluation_id: evaluationId,
      lease_token: leaseToken,
      error_code: errorCode,
    });
  }
}

export function claimContextToInput(claim: ClaimEvalResult): MathEvaluationInput {
  const ctx: ClaimContext = claim.context;
  return {
    evaluationId: claim.evaluation_id,
    attemptId: ctx.attempt.attempt_id,
    leafId: ctx.leaf.id,
    responseFormat: ctx.leaf.response_format as MathResponseFormat,
    requiresReasoning: ctx.profile.requires_reasoning,
    selectedExtractionId: ctx.selected_extraction_id,
    regionIds: ctx.extraction_region_ids,
    authoritySolutions: ctx.solutions,
    criteria: ctx.criteria,
    priorEvaluationId: ctx.attempt.prior_evaluation_id,
  };
}

export interface WorkerEvaluationResult {
  finalized: boolean;
  validation: MathEvaluationValidation;
  evaluationId: string | null;
  failed: boolean;
}

/**
 * Worker-side evaluation flow: claim → build input from pinned context → deterministic evaluator →
 * LAB canonical validation → finalize (valid) or fail INVALID_OUTPUT (invalid). One atomic finalize
 * payload; no partial publish. A valid evaluation whose overall status is NEEDS_HUMAN_REVIEW still
 * finalizes (it is a valid canonical evaluation, not a processing failure, §25/E35).
 */
export async function runWorkerEvaluation(params: {
  worker: MathEvaluationWorkerClient;
  evaluationId: string;
  adapter: MathEvaluatorAdapter;
}): Promise<WorkerEvaluationResult> {
  const claim = await params.worker.claim(params.evaluationId);
  const input = claimContextToInput(claim);
  const candidate = await params.adapter.evaluate(input);
  const validation = validateMathEval(candidate.output, input);

  if (!validation.ok) {
    await params.worker.fail(params.evaluationId, claim.lease_token, "INVALID_OUTPUT");
    return { finalized: false, validation, evaluationId: null, failed: true };
  }

  const evaluationId = await params.worker.finalize(params.evaluationId, claim.lease_token, candidate.output);
  return { finalized: true, validation, evaluationId, failed: false };
}
