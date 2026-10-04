/**
 * MATH-4B — WORKER-ONLY evaluation client + flow. Wraps math_evaluation (claim/finalize/fail), which
 * MATH-2D restricts to the trusted evaluation worker role. Never imported by a student browser
 * component. The student cannot finalize its own evaluation.
 *
 * runWorkerEvaluation enforces LAB fail-closed atomicity (MATH-4A §40/§23): it validates the
 * candidate BEFORE finalize and FAILS the run on invalid output — never a partial "completed" publish.
 */

import { physicalClaimToInput, physicalFinalize } from "./physical-contract";
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
  if ("reasoning_required" in claim.context.profile) return physicalClaimToInput(claim);
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
  timeoutMs?: number;
}): Promise<WorkerEvaluationResult> {
  const claim = await params.worker.claim(params.evaluationId);
  let validation: MathEvaluationValidation;
  let candidate: Awaited<ReturnType<MathEvaluatorAdapter["evaluate"]>>;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  try {
    const input = claimContextToInput(claim);
    candidate = await Promise.race([
      params.adapter.evaluate(input),
      new Promise<never>((_, reject) => { timer = setTimeout(() => {
        timedOut = true; reject(new Error("TIMEOUT"));
      }, Math.min(120000, Math.max(1, params.timeoutMs ?? 45000))); }),
    ]);
  } catch {
    await params.worker.fail(params.evaluationId, claim.lease_token, timedOut ? "TIMEOUT" : "PROCESSING_FAILED");
    return { finalized: false, validation: { ok: false, issues: [] }, evaluationId: null, failed: true };
  } finally { if (timer !== undefined) clearTimeout(timer); }
  try { validation = validateMathEval(candidate.output, claimContextToInput(claim)); }
  catch { validation = { ok: false, issues: [] }; }
  if (!validation.ok) {
    await params.worker.fail(params.evaluationId, claim.lease_token, "INVALID_OUTPUT");
    return { finalized: false, validation, evaluationId: null, failed: true };
  }
  // A finalize transport failure may already have committed. Never compensate here;
  // canonical replay/read and lease fencing resolve that uncertainty.

  let finalOutput: unknown = candidate.output;
  if ("reasoning_required" in claim.context.profile) {
    try { finalOutput = physicalFinalize(candidate.output, claimContextToInput(claim)); }
    catch {
      await params.worker.fail(params.evaluationId, claim.lease_token, "INVALID_OUTPUT");
      return { finalized: false, validation: { ok: false, issues: [] }, evaluationId: null, failed: true };
    }
  }
  const evaluationId = await params.worker.finalize(params.evaluationId, claim.lease_token, finalOutput);
  return { finalized: true, validation, evaluationId, failed: false };
}
