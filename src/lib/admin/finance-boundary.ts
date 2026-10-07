import type { SupabaseClient } from "@supabase/supabase-js";

import { AdminError, mapRpcError } from "./errors";

/**
 * Retained browser contract for the existing finance boundary. The exported UI
 * is disabled in this release and no /api/admin finance server is deployed.
 * Enabling writes requires verified reuse of the existing finance authority;
 * this reconciliation never creates signing material or a finance JWT.
 */
export type CreditGrantInput = {
  accountId: string;
  quantity: number;
  origin: string;
  reason: string;
  requestKey: string;
};

export type CreditGrantResult = {
  grantId: string | null;
  quantity: number;
  origin: string;
};

const BOUNDARY_ERRORS: Record<string, string> = {
  forbidden: "운영자 권한이 확인되지 않았습니다.",
  unauthenticated: "로그인이 필요합니다.",
  unavailable: "지급 경로가 아직 설정되지 않았습니다.",
  request: "입력값을 확인해 주세요.",
  grant_failed: "지급을 처리하지 못했습니다.",
};

export type FinanceClient = Pick<SupabaseClient, "auth">;

export async function requestCreditGrant(
  client: FinanceClient,
  input: CreditGrantInput,
): Promise<CreditGrantResult> {
  let token: string | undefined;
  try {
    const { data } = await client.auth.getSession();
    token = data.session?.access_token;
  } catch {
    throw new AdminError("UNAUTHENTICATED", "sign-in required");
  }
  if (!token) throw new AdminError("UNAUTHENTICATED", "sign-in required");

  let response: Response;
  try {
    response = await fetch("/api/admin/credit-grant", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        account_id: input.accountId,
        quantity: input.quantity,
        origin: input.origin,
        reason: input.reason,
        request_key: input.requestKey,
      }),
    });
  } catch {
    throw new AdminError("NETWORK", "network request failed");
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (!response.ok) {
    const code = typeof body.error === "string" ? body.error : "";
    if (code === "forbidden") throw new AdminError("UNAUTHORIZED", "operator required");
    if (code === "unauthenticated") throw new AdminError("UNAUTHENTICATED", "sign-in required");
    if (code === "unavailable") throw new AdminError("NOT_INSTALLED", "finance boundary unset");
    if (code === "request") throw new AdminError("INVALID_REQUEST", "invalid input");
    // The boundary reports only a status class, so map anything else the same way
    // the read path maps a refused RPC.
    throw mapRpcError({ code: String(response.status), message: BOUNDARY_ERRORS[code] ?? null });
  }

  return {
    grantId: typeof body.grant_id === "string" ? body.grant_id : null,
    quantity: typeof body.quantity === "number" ? body.quantity : input.quantity,
    origin: typeof body.origin === "string" ? body.origin : input.origin,
  };
}
