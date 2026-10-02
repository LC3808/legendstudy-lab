/**
 * MATH-5B — hint reveal binding. Gated L1/L2 retrieval uses the EXISTING MATH-2D student action
 * `math_input` → `reveal_hint` {hint_id, client_submission_id} (dto math-input-v1). Bodies are not
 * preloaded; the server delivers them on explicit, gated reveal. L0 is delivered with the evaluation.
 *
 * NO dedicated runtime op exists for recording a reference-SOLUTION reveal — that is a documented
 * BACKEND_FOLLOW_UP (see SolutionRevealRepository). No APP RPC is invented.
 */

import type { HintLevel, LeakageResult } from "../types";

export { MATH_INPUT_DTO } from "../../math-input/runtime/contract";

export interface RevealHintPayload {
  hint_id: string;
  client_submission_id: string;
}

/** Bounded hint delivery result (math_input reveal_hint). */
export interface RevealHintResult {
  hint_id: string;
  level: HintLevel;
  body: string;
  leakage_class: "SAFE_DIRECTION" | "CONCEPT_REVEAL" | "SOLUTION_REVEAL";
  replayed?: boolean;
}

export interface RevealedHintRecord {
  hintId: string;
  level: HintLevel;
  leakage: LeakageResult;
  atIso: string;
}

/**
 * BACKEND_FOLLOW_UP: recording a reference-solution reveal as MATH-6 learning context has no MATH-2D
 * runtime op yet. LAB uses this narrow interface; Codex must add the backend operation before
 * Production so the reveal context is durably recorded (not client-only).
 */
export interface SolutionRevealRepository {
  recordReveal(context: { evaluationId: string; earlyReveal: boolean; atIso: string }): Promise<void>;
}
