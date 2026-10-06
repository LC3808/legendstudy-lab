import type { QualityRpcClient } from "./client";
import {
  parseJudgmentPage,
  parseReviewState,
  parseSubmitResult,
  type HqCaseReviewState,
  type HqJudgmentCursor,
  type HqJudgmentPage,
  type HqSubmitPayload,
  type HqSubmitResult,
} from "./human-review-contract";
import { HumanReviewError, mapHumanReviewRpcError } from "./human-review-errors";

/**
 * Human Review (HQP) client. Uses the existing authenticated browser Supabase
 * session and calls only the canonical HQP RPCs. No direct `human_quality_*`
 * table access, no privileged key, no payload/JWT logging.
 */
export interface HumanReviewClient {
  getReviewState(evaluationIds: string[]): Promise<HqCaseReviewState[]>;
  listJudgments(evaluationId: string, options?: HqListOptions): Promise<HqJudgmentPage>;
  submitJudgment(payload: HqSubmitPayload): Promise<HqSubmitResult>;
}

export interface HqListOptions {
  limit?: number;
  cursor?: HqJudgmentCursor | null;
}

/** Server-enforced maximum for a single ql_review_state batch. */
export const HQ_REVIEW_STATE_MAX_BATCH = 100;

function clampListLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) return 20;
  const floored = Math.floor(limit);
  if (floored < 1) return 1;
  if (floored > 100) return 100;
  return floored;
}

export function createHumanReviewClient(client: QualityRpcClient): HumanReviewClient {
  async function requireSession(): Promise<void> {
    try {
      const { data } = await client.auth.getSession();
      if (!data.session) throw new HumanReviewError("UNAUTHENTICATED", "sign-in required");
    } catch (error) {
      if (error instanceof HumanReviewError) throw error;
      throw new HumanReviewError("UNAUTHENTICATED", "sign-in required");
    }
  }

  async function callRpc<T = unknown>(fn: string, params: Record<string, unknown>): Promise<T> {
    let result: { data: unknown; error: unknown };
    try {
      result = (await client.rpc(fn, params)) as { data: unknown; error: unknown };
    } catch {
      throw new HumanReviewError("NETWORK_AMBIGUOUS", "network request failed");
    }
    if (result.error) {
      throw mapHumanReviewRpcError(result.error as { code?: string | null; message?: string | null });
    }
    return result.data as T;
  }

  return {
    async getReviewState(evaluationIds: string[]): Promise<HqCaseReviewState[]> {
      await requireSession();
      const unique = Array.from(new Set(evaluationIds.filter((id) => typeof id === "string" && id.length > 0)));
      if (unique.length === 0) return [];
      if (unique.length > HQ_REVIEW_STATE_MAX_BATCH) {
        // Caller must batch within the contract maximum; fail loudly rather than
        // silently truncating review state.
        throw new HumanReviewError("VALIDATION", "review-state batch exceeds maximum");
      }
      const data = await callRpc<unknown>("ql_review_state", { p_evaluation_ids: unique });
      return parseReviewState(data);
    },

    async listJudgments(evaluationId: string, options: HqListOptions = {}): Promise<HqJudgmentPage> {
      if (!evaluationId) throw new HumanReviewError("NOT_FOUND", "case not found");
      await requireSession();
      const params: Record<string, unknown> = { p_evaluation_id: evaluationId, p_limit: clampListLimit(options.limit) };
      if (options.cursor) {
        params.p_before = options.cursor.created_at;
        params.p_before_id = options.cursor.judgment_id;
      }
      const data = await callRpc<unknown>("ql_list_human_judgments", params);
      return parseJudgmentPage(data);
    },

    async submitJudgment(payload: HqSubmitPayload): Promise<HqSubmitResult> {
      await requireSession();
      // Exact payload is passed through; never logged.
      const data = await callRpc<unknown>("ql_submit_human_judgment", { p_payload: payload });
      return parseSubmitResult(data);
    },
  };
}
