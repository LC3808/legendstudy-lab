/**
 * MATH-5B — student-facing learning runtime client (browser-safe). Wraps the MATH-2D `math_input`
 * reveal_hint action for gated L1/L2 retrieval. No worker credential, no direct DB write, no Credit.
 */

import { MATH_INPUT_DTO } from "../../math-input/runtime/contract";
import { callRuntime, type MathRpcTransport } from "../../math-input/runtime/transport";
import type { RevealHintPayload, RevealHintResult, SolutionRevealRepository } from "./contract";

export class LearningRuntimeClient {
  constructor(private readonly transport: MathRpcTransport) {}

  /** Gated reveal of a hint body (L1/L2). Server enforces gating + idempotency + no Credit. */
  revealHint(hintId: string, clientSubmissionId: string): Promise<RevealHintResult> {
    const payload: RevealHintPayload = { hint_id: hintId, client_submission_id: clientSubmissionId };
    return callRuntime<RevealHintResult>(this.transport, "math_input", MATH_INPUT_DTO, "reveal_hint", {
      ...payload,
    });
  }
}

/** In-memory SolutionRevealRepository for tests (real impl pends the BACKEND_FOLLOW_UP, contract.ts). */
export function createInMemorySolutionRevealRepository(): SolutionRevealRepository & {
  readonly records: Array<{ evaluationId: string; earlyReveal: boolean; atIso: string }>;
} {
  const records: Array<{ evaluationId: string; earlyReveal: boolean; atIso: string }> = [];
  return {
    records,
    async recordReveal(context) {
      records.push(context);
    },
  };
}
