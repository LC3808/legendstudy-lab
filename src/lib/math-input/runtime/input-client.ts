/**
 * MATH-3B-R — student Math input client (browser-safe). Wraps the `math_input` RPC only. Never calls
 * the worker-only `math_extraction` surface. Server derives owner identity from the JWT; this client
 * sends no owner/account/profile authority field. Server readiness is authoritative (read_input).
 */

import {
  MATH_INPUT_DTO,
  type ConfirmExtractionResult,
  type ConfirmRegion,
  type CreateAttemptPayload,
  type CreateAttemptResult,
  type EvidenceMetadata,
  type ReadInputResult,
  type RegisterEvidenceResult,
} from "./contract";
import { callRuntime, type MathRpcTransport } from "./transport";

export class MathInputClient {
  constructor(private readonly transport: MathRpcTransport) {}

  createAttempt(payload: CreateAttemptPayload): Promise<CreateAttemptResult> {
    return callRuntime<CreateAttemptResult>(this.transport, "math_input", MATH_INPUT_DTO, "create_attempt", {
      ...payload,
    });
  }

  registerEvidence(attemptId: string, metadata: EvidenceMetadata): Promise<RegisterEvidenceResult> {
    return callRuntime<RegisterEvidenceResult>(this.transport, "math_input", MATH_INPUT_DTO, "register_evidence", {
      attempt_id: attemptId,
      metadata,
    });
  }

  confirmExtraction(
    attemptId: string,
    runId: string,
    regions: ConfirmRegion[],
  ): Promise<ConfirmExtractionResult> {
    return callRuntime<ConfirmExtractionResult>(this.transport, "math_input", MATH_INPUT_DTO, "confirm_extraction", {
      attempt_id: attemptId,
      run_id: runId,
      regions,
    });
  }

  /** Canonical, server-derived readiness/state for an attempt. */
  readInput(attemptId: string): Promise<ReadInputResult> {
    return callRuntime<ReadInputResult>(this.transport, "math_input", MATH_INPUT_DTO, "read_input", {
      attempt_id: attemptId,
    });
  }
}
