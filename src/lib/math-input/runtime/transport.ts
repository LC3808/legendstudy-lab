/**
 * MATH-3B-R — transport boundary. A thin interface over PostgREST `rpc(fn, { p_request })`, injected
 * so MATH-3B domain modules never call Supabase directly and tests use a deterministic mock server.
 */

import { MathRuntimeError, mapTransportError } from "./errors";
import type { MathRpcFunction, RuntimeEnvelope, RuntimeResponse } from "./contract";

export interface MathRpcTransport {
  rpc(fn: MathRpcFunction, pRequest: RuntimeEnvelope): Promise<unknown>;
}

export function buildEnvelope<P extends Record<string, unknown>>(
  dtoVersion: string,
  action: string,
  payload: P,
): RuntimeEnvelope<P> {
  return { dto_version: dtoVersion, action, payload };
}

/**
 * Parse a runtime response, failing closed on a dto_version / shape mismatch. Returns `result`.
 */
export async function callRuntime<R>(
  transport: MathRpcTransport,
  fn: MathRpcFunction,
  expectedDtoVersion: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<R> {
  let raw: unknown;
  try {
    raw = await transport.rpc(fn, buildEnvelope(expectedDtoVersion, action, payload));
  } catch (error) {
    throw mapTransportError(error);
  }
  if (typeof raw !== "object" || raw === null) {
    throw new MathRuntimeError("MALFORMED_RESPONSE", "non-object runtime response");
  }
  const response = raw as Partial<RuntimeResponse<R>>;
  if (response.dto_version !== expectedDtoVersion) {
    throw new MathRuntimeError("UNSUPPORTED_DTO", `unexpected dto_version ${String(response.dto_version)}`);
  }
  if (response.action !== action) {
    throw new MathRuntimeError("MALFORMED_RESPONSE", "response action mismatch");
  }
  if (!("result" in response)) {
    throw new MathRuntimeError("MALFORMED_RESPONSE", "missing result");
  }
  return response.result as R;
}
