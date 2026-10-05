import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseCredit,
  parseDashboard,
  parseMemberDetail,
  parseSearchPage,
  type AdminCredit,
  type AdminDashboard,
  type AdminMemberDetail,
  type AdminSearchPage,
} from "./contract";
import { AdminError, mapRpcError } from "./errors";

/**
 * Canonical admin read client (`admin-v1` consumer).
 *
 * Uses the existing authenticated browser Supabase session and calls only the
 * deployed, operator-gated SECURITY DEFINER functions. It never touches
 * operations tables directly, never uses a privileged key, and never logs a
 * token or an answer body. Authorization is enforced by the database;
 * `isOperator()` is defense-in-depth UI gating only.
 *
 * This client is read-only by construction — there is no grant, cancel or
 * reconcile method, because ADMIN-P0-A implements no write authority.
 */
export interface AdminClient {
  isOperator(): Promise<boolean>;
  dashboard(): Promise<AdminDashboard>;
  searchMembers(query: string, options?: AdminPageOptions): Promise<AdminSearchPage>;
  memberDetail(accountId: string): Promise<AdminMemberDetail>;
  memberCredit(accountId: string, options?: AdminPageOptions): Promise<AdminCredit>;
}

export interface AdminPageOptions {
  limit?: number;
  offset?: number;
}

export const ADMIN_DEFAULT_LIMIT = 25;
export const ADMIN_MAX_LIMIT = 50;
export const ADMIN_MAX_OFFSET = 10000;
export const ADMIN_MIN_QUERY = 3;
export const ADMIN_MAX_QUERY = 254;

/** Only the methods this adapter needs, so tests need no full SDK client. */
export type AdminRpcClient = Pick<SupabaseClient, "rpc" | "auth">;

function clampLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return ADMIN_DEFAULT_LIMIT;
  const floored = Math.floor(limit);
  if (floored < 1) return 1;
  if (floored > ADMIN_MAX_LIMIT) return ADMIN_MAX_LIMIT;
  return floored;
}

function clampOffset(offset: number | undefined): number {
  if (typeof offset !== "number" || !Number.isFinite(offset)) return 0;
  const floored = Math.floor(offset);
  if (floored < 0) return 0;
  if (floored > ADMIN_MAX_OFFSET) return ADMIN_MAX_OFFSET;
  return floored;
}

export function createAdminClient(client: AdminRpcClient): AdminClient {
  async function requireSession(): Promise<void> {
    try {
      const { data } = await client.auth.getSession();
      if (!data.session) throw new AdminError("UNAUTHENTICATED", "sign-in required");
    } catch (error) {
      if (error instanceof AdminError) throw error;
      throw new AdminError("UNAUTHENTICATED", "sign-in required");
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
      throw new AdminError("NETWORK", "network request failed");
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
      // error. Only unexpected failures surface as a thrown AdminError.
      const data = await callRpc<unknown>("admin_operator", undefined);
      return data === true;
    },

    async dashboard(): Promise<AdminDashboard> {
      await requireSession();
      return parseDashboard(await callRpc<unknown>("admin_dashboard", undefined));
    },

    async searchMembers(query: string, options: AdminPageOptions = {}): Promise<AdminSearchPage> {
      await requireSession();
      const trimmed = typeof query === "string" ? query.trim() : "";
      if (trimmed.length < ADMIN_MIN_QUERY || trimmed.length > ADMIN_MAX_QUERY) {
        throw new AdminError("INVALID_REQUEST", "invalid query");
      }
      const data = await callRpc<unknown>("admin_member_search", {
        p_query: trimmed,
        p_limit: clampLimit(options.limit),
        p_offset: clampOffset(options.offset),
      });
      return parseSearchPage(data);
    },

    async memberDetail(accountId: string): Promise<AdminMemberDetail> {
      await requireSession();
      if (!accountId) throw new AdminError("INVALID_REQUEST", "invalid account");
      return parseMemberDetail(await callRpc<unknown>("admin_member_detail", { p_account_id: accountId }));
    },

    async memberCredit(accountId: string, options: AdminPageOptions = {}): Promise<AdminCredit> {
      await requireSession();
      if (!accountId) throw new AdminError("INVALID_REQUEST", "invalid account");
      return parseCredit(
        await callRpc<unknown>("admin_member_credit", {
          p_account_id: accountId,
          p_limit: clampLimit(options.limit),
          p_offset: clampOffset(options.offset),
        }),
      );
    },
  };
}
