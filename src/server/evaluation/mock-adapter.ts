import "server-only";

import type { EvaluationJob, EvaluationRequest } from "./types";

/**
 * Architecture placeholder only. Phase 2 performs no model call, persistence,
 * queue operation, credit reservation, or evaluation result generation.
 */
export async function createSyntheticEvaluationJob(
  request: EvaluationRequest,
): Promise<EvaluationJob> {
  return {
    id: `future-job-${request.packageId}`,
    attemptId: "FUTURE_AUTHENTICATED_ATTEMPT_REQUIRED",
    packageId: request.packageId,
    packageVersion: request.packageVersion,
    status: "CREATED",
    createdAt: new Date(0).toISOString(),
  };
}
