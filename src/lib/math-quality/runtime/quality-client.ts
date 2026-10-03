/**
 * MATH-7B — Math Quality Console operator client (browser-safe). Wraps qlm_quality (operator-gated
 * server-side via is_quality_operator; no privileged service-role key in the browser). Reviews AI quality only.
 */

import { callRuntime, type MathRpcTransport } from "../../math-input/runtime/transport";
import {
  QLM_RUNTIME_DTO,
  type QlmDetailResult,
  type QlmHistoryResult,
  type QlmListResult,
  type QlmReviewStateResult,
  type QlmSubmitResult,
} from "./contract";
import type { HqMathJudgment } from "../types";

export class MathQualityClient {
  constructor(private readonly transport: MathRpcTransport) {}

  listCases(options: { limit?: number; beforeAt?: string; beforeId?: string } = {}): Promise<QlmListResult> {
    const payload: Record<string, unknown> = {};
    if (options.limit !== undefined) payload.limit = options.limit;
    if (options.beforeAt !== undefined && options.beforeId !== undefined) {
      payload.before_at = options.beforeAt;
      payload.before_id = options.beforeId;
    }
    return callRuntime<QlmListResult>(this.transport, "qlm_quality", QLM_RUNTIME_DTO, "list", payload);
  }

  caseDetail(evaluationId: string): Promise<QlmDetailResult> {
    return callRuntime<QlmDetailResult>(this.transport, "qlm_quality", QLM_RUNTIME_DTO, "detail", {
      evaluation_id: evaluationId,
    });
  }

  submitJudgment(judgment: HqMathJudgment): Promise<QlmSubmitResult> {
    return callRuntime<QlmSubmitResult>(this.transport, "qlm_quality", QLM_RUNTIME_DTO, "submit_judgment", {
      judgment,
    });
  }

  reviewState(evaluationIds: string[]): Promise<QlmReviewStateResult> {
    return callRuntime<QlmReviewStateResult>(this.transport, "qlm_quality", QLM_RUNTIME_DTO, "review_state", {
      evaluation_ids: evaluationIds,
    });
  }

  history(evaluationId: string, options: { limit?: number; beforeAt?: string; beforeId?: string } = {}): Promise<QlmHistoryResult> {
    const payload: Record<string, unknown> = { evaluation_id: evaluationId };
    if (options.limit !== undefined) payload.limit = options.limit;
    if (options.beforeAt !== undefined && options.beforeId !== undefined) {
      payload.before_at = options.beforeAt;
      payload.before_id = options.beforeId;
    }
    return callRuntime<QlmHistoryResult>(this.transport, "qlm_quality", QLM_RUNTIME_DTO, "history", payload);
  }
}
