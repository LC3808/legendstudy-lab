/**
 * MATH-3B-R — runtime error taxonomy. Maps MATH-2D Postgres/PostgREST codes to bounded consumer
 * codes (README §Validation). Errors never carry answer text, JWTs, or privileged payloads.
 */

export type MathRuntimeErrorCode =
  | "UNAUTHORIZED" // 42501
  | "INVALID_OR_STALE" // 22023
  | "CONFLICT" // 23505
  | "UNAVAILABLE" // P0002
  | "RESPONSE_BOUND" // 54000
  | "UNSUPPORTED_DTO"
  | "MALFORMED_RESPONSE"
  | "NETWORK"
  | "UNKNOWN";

export class MathRuntimeError extends Error {
  readonly code: MathRuntimeErrorCode;
  readonly pgCode: string | null;

  constructor(code: MathRuntimeErrorCode, message: string, pgCode: string | null = null) {
    super(message);
    this.name = "MathRuntimeError";
    this.code = code;
    this.pgCode = pgCode;
  }
}

const PG_MAP: Record<string, MathRuntimeErrorCode> = {
  "42501": "UNAUTHORIZED",
  "22023": "INVALID_OR_STALE",
  "23505": "CONFLICT",
  P0002: "UNAVAILABLE",
  "54000": "RESPONSE_BOUND",
};

/** Map an unknown thrown transport error to a bounded MathRuntimeError. */
export function mapTransportError(error: unknown): MathRuntimeError {
  if (error instanceof MathRuntimeError) return error;
  const pgCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : null;
  if (pgCode && PG_MAP[pgCode]) {
    return new MathRuntimeError(PG_MAP[pgCode], `runtime error ${pgCode}`, pgCode);
  }
  return new MathRuntimeError("UNKNOWN", "unknown runtime error");
}
