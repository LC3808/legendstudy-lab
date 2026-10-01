/**
 * Human Review (HQP write + read) error taxonomy. Kept separate from the
 * `ql-read-v1` QualityError so the existing adapter stays untouched. Carries only
 * a stable `kind` and a short non-sensitive message — never payloads, answer text
 * or tokens.
 */
export type HumanReviewErrorKind =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "IDEMPOTENCY_CONFLICT"
  | "STALE_CORRECTION"
  | "UNSUPPORTED_RUBRIC"
  | "MALFORMED_RESPONSE"
  | "NETWORK_AMBIGUOUS"
  | "UNKNOWN";

export class HumanReviewError extends Error {
  readonly kind: HumanReviewErrorKind;

  constructor(kind: HumanReviewErrorKind, message?: string) {
    super(message ?? kind);
    this.name = "HumanReviewError";
    this.kind = kind;
    Object.setPrototypeOf(this, HumanReviewError.prototype);
  }
}

export function isHumanReviewError(value: unknown): value is HumanReviewError {
  return value instanceof HumanReviewError;
}

export function humanReviewErrorKind(value: unknown): HumanReviewErrorKind {
  return isHumanReviewError(value) ? value.kind : "UNKNOWN";
}

type RpcErrorLike = { code?: string | null; message?: string | null };

/**
 * Map a Supabase RPC error from the HQP functions to a UI error kind, using the
 * Postgres error code as the primary signal. Note: a missing evaluation surfaces
 * as `P0002` (HTTP 500 at the gateway, not 404) — classified NOT_FOUND here while
 * the UI shows "평가를 찾을 수 없습니다"; never relabel the evidence as 404.
 */
export function mapHumanReviewRpcError(error: RpcErrorLike | null | undefined): HumanReviewError {
  const code = error?.code ?? "";
  const raw = typeof error?.message === "string" ? error.message : "";
  const lower = raw.toLowerCase();

  if (code === "42501") return new HumanReviewError("UNAUTHORIZED", "operator access required");
  if (code === "P0002") return new HumanReviewError("NOT_FOUND", "case not found");
  if (code === "23505") return new HumanReviewError("IDEMPOTENCY_CONFLICT", "submission key conflict");
  if (code === "23514") {
    if (/correction head|supersed/.test(lower)) {
      return new HumanReviewError("STALE_CORRECTION", "correction target already superseded");
    }
    return new HumanReviewError("VALIDATION", "rejected by server consistency rule");
  }
  if (code === "22023" || code === "22004") return new HumanReviewError("VALIDATION", "invalid submission");

  if (/jwt|unauthor|not authenticated|permission denied/.test(lower)) {
    return new HumanReviewError("UNAUTHORIZED", "operator access required");
  }
  if (/fetch|network|timeout|connection|failed to send/.test(lower)) {
    return new HumanReviewError("NETWORK_AMBIGUOUS", "network request failed");
  }
  return new HumanReviewError("UNKNOWN", "request failed");
}
