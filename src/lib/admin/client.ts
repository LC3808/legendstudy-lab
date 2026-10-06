import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseCredit,
  parseDashboard,
  parseInquiryDetail,
  parseInquiryPage,
  parseMemberDetail,
  parseMyInquiries,
  parseOpsOverview,
  parseOpsPage,
  parsePaymentPage,
  parseSearchPage,
  parseSupportMetrics,
  type AdminCredit,
  type AdminDashboard,
  type AdminInquiryDetail,
  type AdminInquiryPage,
  type AdminMemberDetail,
  type AdminPaymentPage,
  type AdminSearchPage,
  type AdminSupportMetrics,
  type MyInquiryRow,
  type OpsOverview,
  type OpsPage,
} from "./contract";
import { AdminError, mapRpcError } from "./errors";

/**
 * Canonical admin read client (`admin-v1` consumer).
 *
 * Uses the existing authenticated browser Supabase session and calls only the
 * deployed, operator-gated SECURITY DEFINER functions. It never touches
 * operations tables directly, never uses a privileged key, and never logs a
 * token, an answer body or an inquiry body. Authorization is enforced by the
 * database; `isOperator()` is defense-in-depth UI gating only.
 *
 * The client is read-only with respect to money. Credit is issued through the
 * server boundary in `@/lib/admin/finance-boundary`, which holds the finance
 * bearer; no browser call can reach `essay_admin_grant` or `payment_support`.
 */
export interface AdminClient {
  isOperator(): Promise<boolean>;
  dashboard(): Promise<AdminDashboard>;
  searchMembers(query: string, options?: AdminPageOptions): Promise<AdminSearchPage>;
  memberDetail(accountId: string): Promise<AdminMemberDetail>;
  memberCredit(accountId: string, options?: AdminPageOptions): Promise<AdminCredit>;
  paymentOrders(options?: AdminOrderOptions): Promise<AdminPaymentPage>;
  supportMetrics(): Promise<AdminSupportMetrics>;
  inquiryList(options?: AdminInquiryOptions): Promise<AdminInquiryPage>;
  inquiryDetail(inquiryId: string): Promise<AdminInquiryDetail>;
  replyInquiry(input: InquiryReplyInput): Promise<{ replyId: string; created: boolean }>;
  setInquiryStatus(input: InquiryStatusInput): Promise<{ status: string; changed: boolean }>;
  submitInquiry(input: InquirySubmitInput): Promise<{ inquiryId: string; created: boolean }>;
  myInquiries(): Promise<MyInquiryRow[]>;
  operationsSummary(): Promise<OpsOverview>;
  essayOperations(options?: OpsOptions): Promise<OpsPage>;
  mathOperations(options?: OpsOptions): Promise<OpsPage>;
}

export interface OpsOptions {
  limit?: number;
  /** Only rows older than this instant, for paging backwards in time. */
  before?: string | null;
  /** Essay only. Ignored by the Math read, which has no status filter. */
  status?: string | null;
}

export interface AdminPageOptions {
  limit?: number;
  offset?: number;
}

export interface AdminOrderOptions extends AdminPageOptions {
  query?: string;
  state?: string;
}

export interface AdminInquiryOptions extends AdminPageOptions {
  query?: string;
  status?: string;
}

export interface InquiryReplyInput {
  inquiryId: string;
  body: string;
  requestKey: string;
}

export interface InquiryStatusInput {
  inquiryId: string;
  status: string;
}

export interface InquirySubmitInput {
  category: string;
  title: string;
  body: string;
  requestKey: string;
}

export const ADMIN_DEFAULT_LIMIT = 25;
export const ADMIN_MAX_LIMIT = 50;
export const ADMIN_MAX_OFFSET = 10000;
export const ADMIN_MIN_QUERY = 3;
export const ADMIN_MAX_QUERY = 254;

export const INQUIRY_MIN_TITLE = 4;
export const INQUIRY_MAX_TITLE = 120;
export const INQUIRY_MIN_BODY = 10;
export const INQUIRY_MAX_BODY = 2000;
export const INQUIRY_MAX_REPLY = 4000;

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

/** Returns the trimmed query, or undefined when the caller left it empty. */
function optionalQuery(query: string | undefined): string | undefined {
  if (typeof query !== "string") return undefined;
  const trimmed = query.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < ADMIN_MIN_QUERY || trimmed.length > ADMIN_MAX_QUERY) {
    throw new AdminError("INVALID_REQUEST", "invalid query");
  }
  return trimmed;
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

    async paymentOrders(options: AdminOrderOptions = {}): Promise<AdminPaymentPage> {
      await requireSession();
      const payload: Record<string, unknown> = {
        dto_version: "admin-v1",
        limit: clampLimit(options.limit),
        offset: clampOffset(options.offset),
      };
      const query = optionalQuery(options.query);
      if (query) payload.query = query;
      if (options.state) payload.state = options.state;
      return parsePaymentPage(await callRpc<unknown>("admin_payment_orders", { p: payload }));
    },

    async supportMetrics(): Promise<AdminSupportMetrics> {
      await requireSession();
      return parseSupportMetrics(await callRpc<unknown>("admin_support_metrics", undefined));
    },

    async inquiryList(options: AdminInquiryOptions = {}): Promise<AdminInquiryPage> {
      await requireSession();
      const payload: Record<string, unknown> = {
        dto_version: "admin-v1",
        limit: clampLimit(options.limit),
        offset: clampOffset(options.offset),
      };
      const query = optionalQuery(options.query);
      if (query) payload.query = query;
      if (options.status) payload.status = options.status;
      return parseInquiryPage(await callRpc<unknown>("admin_inquiry_list", { p: payload }));
    },

    async inquiryDetail(inquiryId: string): Promise<AdminInquiryDetail> {
      await requireSession();
      if (!inquiryId) throw new AdminError("INVALID_REQUEST", "invalid inquiry");
      return parseInquiryDetail(
        await callRpc<unknown>("admin_inquiry_detail", {
          p: { dto_version: "admin-v1", id: inquiryId },
        }),
      );
    },

    async replyInquiry(input: InquiryReplyInput): Promise<{ replyId: string; created: boolean }> {
      await requireSession();
      const body = typeof input.body === "string" ? input.body.trim() : "";
      if (!input.inquiryId || !body) throw new AdminError("INVALID_REQUEST", "invalid reply");
      if (body.length > INQUIRY_MAX_REPLY) throw new AdminError("INVALID_REQUEST", "invalid reply");
      const data = await callRpc<Record<string, unknown>>("admin_inquiry_reply", {
        p: {
          dto_version: "admin-v1",
          id: input.inquiryId,
          body,
          request_key: input.requestKey,
        },
      });
      return { replyId: String(data.reply_id ?? ""), created: data.created === true };
    },

    async setInquiryStatus(input: InquiryStatusInput): Promise<{ status: string; changed: boolean }> {
      await requireSession();
      if (!input.inquiryId || !input.status) {
        throw new AdminError("INVALID_REQUEST", "invalid status");
      }
      const data = await callRpc<Record<string, unknown>>("admin_inquiry_set_status", {
        p: { dto_version: "admin-v1", id: input.inquiryId, status: input.status },
      });
      return { status: String(data.status ?? ""), changed: data.changed === true };
    },

    async submitInquiry(input: InquirySubmitInput): Promise<{ inquiryId: string; created: boolean }> {
      await requireSession();
      const title = typeof input.title === "string" ? input.title.trim() : "";
      const body = typeof input.body === "string" ? input.body.trim() : "";
      if (title.length < INQUIRY_MIN_TITLE || title.length > INQUIRY_MAX_TITLE) {
        throw new AdminError("INVALID_REQUEST", "invalid title");
      }
      if (body.length < INQUIRY_MIN_BODY || body.length > INQUIRY_MAX_BODY) {
        throw new AdminError("INVALID_REQUEST", "invalid body");
      }
      const data = await callRpc<Record<string, unknown>>("inquiry_submit", {
        p: {
          dto_version: "inquiry-v1",
          category: input.category,
          title,
          body,
          request_key: input.requestKey,
        },
      });
      return { inquiryId: String(data.inquiry_id ?? ""), created: data.created === true };
    },

    async myInquiries(): Promise<MyInquiryRow[]> {
      await requireSession();
      return parseMyInquiries(
        await callRpc<unknown>("inquiry_mine", { p: { dto_version: "inquiry-v1" } }),
      );
    },
    async operationsSummary(): Promise<OpsOverview> {
      await requireSession();
      return parseOpsOverview(await callRpc<unknown>("admin_operations_summary", {}));
    },
    async essayOperations(options: OpsOptions = {}): Promise<OpsPage> {
      await requireSession();
      return parseOpsPage(
        await callRpc<unknown>("admin_essay_operations", {
          p_limit: clampLimit(options.limit),
          p_status: options.status ? options.status : null,
          p_before: options.before ? options.before : null,
        }),
      );
    },
    async mathOperations(options: OpsOptions = {}): Promise<OpsPage> {
      await requireSession();
      return parseOpsPage(
        await callRpc<unknown>("admin_math_operations", {
          p_limit: clampLimit(options.limit),
          p_before: options.before ? options.before : null,
        }),
      );
    },
  };
}
