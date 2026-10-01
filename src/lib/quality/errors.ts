/**
 * Quality adapter error taxonomy.
 *
 * These are *consumer* states, not DB facts. The UI switches on `kind` to show
 * the correct state; it must never collapse these into one another. In
 * particular EMPTY is not an error and must never be represented as UNAUTHORIZED,
 * NETWORK, or MALFORMED (and vice versa). See LEC-1 mapping §7 and task §32.
 */
export type QualityErrorKind =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "UNSUPPORTED_DTO"
  | "NETWORK"
  | "MALFORMED_RESPONSE"
  | "UNKNOWN";

/**
 * Carries only a stable `kind` and a short, non-sensitive message. It never
 * stores raw response bodies, access tokens, or student answer text, so logging
 * or surfacing a QualityError cannot leak privileged evidence.
 */
export class QualityError extends Error {
  readonly kind: QualityErrorKind;

  constructor(kind: QualityErrorKind, message?: string) {
    super(message ?? kind);
    this.name = "QualityError";
    this.kind = kind;
    // Keep the prototype chain correct when compiled down to ES2017.
    Object.setPrototypeOf(this, QualityError.prototype);
  }
}

export function isQualityError(value: unknown): value is QualityError {
  return value instanceof QualityError;
}

export function qualityErrorKind(value: unknown): QualityErrorKind {
  return isQualityError(value) ? value.kind : "UNKNOWN";
}

/**
 * A minimal, defensively-typed view of a PostgREST/Supabase RPC error. We read
 * only the Postgres error `code` and avoid depending on the full SDK error shape.
 */
type RpcErrorLike = {
  code?: string | null;
  message?: string | null;
};

/**
 * Map a Supabase RPC error to a consumer error kind using the Postgres error
 * code as the primary signal. The canonical functions raise:
 *   - `42501` (insufficient_privilege) when the caller is not an operator
 *   - `P0002` (no_data_found) when a case id does not resolve
 *   - `22004` (null_value_not_allowed) when the evaluation id is missing
 * Transport-level failures (no code, fetch/network message) map to NETWORK.
 */
export function mapRpcError(error: RpcErrorLike | null | undefined): QualityError {
  const code = error?.code ?? "";
  const rawMessage = typeof error?.message === "string" ? error.message : "";

  if (code === "42501") return new QualityError("UNAUTHORIZED", "operator access required");
  if (code === "P0002" || code === "PGRST116") return new QualityError("NOT_FOUND", "case not found");
  if (code === "22004") return new QualityError("MALFORMED_RESPONSE", "invalid request argument");

  // PostgREST surfaces auth failures without a Postgres code; detect by message.
  const lower = rawMessage.toLowerCase();
  if (/jwt|unauthor|not authenticated|permission denied/.test(lower)) {
    return new QualityError("UNAUTHORIZED", "operator access required");
  }
  if (/fetch|network|timeout|connection|failed to send/.test(lower)) {
    return new QualityError("NETWORK", "network request failed");
  }

  return new QualityError("UNKNOWN", "request failed");
}
