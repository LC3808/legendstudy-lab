import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseCaseDetail,
  parseListEnvelope,
  type QualityCaseDetail,
  type QualityListCursor,
  type QualityListPage,
} from "./contract";
import { QualityError, mapRpcError } from "./errors";

/**
 * Canonical Quality read client (`ql-read-v1` consumer).
 *
 * It uses the existing authenticated browser Supabase session and calls only the
 * deployed SECURITY DEFINER RPCs. It never touches Essay tables, never uses a
 * privileged key, and never logs JWTs or answer text. Authorization is enforced
 * by the database; `isOperator()` is defense-in-depth UI gating only.
 */
export interface QualityClient {
  isOperator(): Promise<boolean>;
  listCases(options?: QualityListOptions): Promise<QualityListPage>;
  getCaseDetail(evaluationId: string): Promise<QualityCaseDetail>;
}

export interface QualityListOptions {
  limit?: number;
  cursor?: QualityListCursor | null;
}

export const QUALITY_LIST_DEFAULT_LIMIT = 50;
export const QUALITY_LIST_MAX_LIMIT = 100;

/**
 * Minimal structural view of a Supabase client — only the two methods this
 * adapter needs. Keeps the adapter testable without constructing a full SDK
 * client, and avoids coupling to SDK internals.
 */
export type QualityRpcClient = Pick<SupabaseClient, "rpc" | "auth">;

function clampLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) return QUALITY_LIST_DEFAULT_LIMIT;
  const floored = Math.floor(limit);
  if (floored < 1) return 1;
  if (floored > QUALITY_LIST_MAX_LIMIT) return QUALITY_LIST_MAX_LIMIT;
  return floored;
}

export function createQualityClient(client: QualityRpcClient): QualityClient {
  async function requireSession(): Promise<void> {
    try {
      const { data } = await client.auth.getSession();
      if (!data.session) throw new QualityError("UNAUTHENTICATED", "sign-in required");
    } catch (error) {
      if (error instanceof QualityError) throw error;
      throw new QualityError("UNAUTHENTICATED", "sign-in required");
    }
  }

  async function callRpc<T = unknown>(
    fn: string,
    params: Record<string, unknown> | undefined,
  ): Promise<T> {
    let result: { data: unknown; error: unknown };
    try {
      result = (await client.rpc(fn, params)) as { data: unknown; error: unknown };
    } catch {
      // A thrown error here is a transport/fetch failure, not an RPC error body.
      throw new QualityError("NETWORK", "network request failed");
    }
    if (result.error) {
      throw mapRpcError(result.error as { code?: string | null; message?: string | null });
    }
    return result.data as T;
  }

  return {
    async isOperator(): Promise<boolean> {
      await requireSession();
      // Granted to authenticated callers: a non-operator receives `false`, not an
      // error. Only unexpected failures surface as a thrown QualityError.
      const data = await callRpc<unknown>("is_quality_operator", undefined);
      return data === true;
    },

    async listCases(options: QualityListOptions = {}): Promise<QualityListPage> {
      await requireSession();
      const params: Record<string, unknown> = { p_limit: clampLimit(options.limit) };
      if (options.cursor) {
        // Paired keyset cursor — both halves travel together.
        params.p_before = options.cursor.requested_at;
        params.p_before_id = options.cursor.evaluation_id;
      }
      const data = await callRpc<unknown>("ql_list_cases", params);
      return parseListEnvelope(data);
    },

    async getCaseDetail(evaluationId: string): Promise<QualityCaseDetail> {
      if (!evaluationId) throw new QualityError("NOT_FOUND", "case not found");
      await requireSession();
      const data = await callRpc<unknown>("ql_case_detail", { p_evaluation_id: evaluationId });
      return parseCaseDetail(data);
    },
  };
}
