/**
 * MATH-5B — deterministic mock of the MATH-2D `math_input` reveal_hint surface (TEST transport).
 * Enforces progressive gating (L2 requires L1), idempotency, no Credit, no scoring. Not canonical.
 */

import { MATH_INPUT_DTO } from "../../math-input/runtime/contract";
import { MathRuntimeError } from "../../math-input/runtime/errors";
import type { MathRpcTransport } from "../../math-input/runtime/transport";
import type { HintLevel } from "../types";

interface SeededHint {
  hint_id: string;
  evaluation_id: string;
  level: HintLevel;
  body: string;
  leakage_class: "SAFE_DIRECTION" | "CONCEPT_REVEAL" | "SOLUTION_REVEAL";
}

export interface HintExposureRow {
  evaluation_id: string;
  hint_id: string;
  level: HintLevel;
  client_submission_id: string;
}

export interface MockLearningServer {
  studentTransport(subject: string): MathRpcTransport;
  seedHint(hint: SeededHint): void;
  state: { exposures: HintExposureRow[] };
}

export function createMockLearningServer(): MockLearningServer {
  const hints = new Map<string, SeededHint>();
  const exposures: HintExposureRow[] = [];
  const idempotency = new Map<string, string>(); // client_submission_id -> hint_id

  const invalid = (m: string) => new MathRuntimeError("INVALID_OR_STALE", m, "22023");
  const conflict = (m: string) => new MathRuntimeError("CONFLICT", m, "23505");

  function revealHint(payload: Record<string, unknown>): unknown {
    const hintId = String(payload.hint_id ?? "");
    const csid = String(payload.client_submission_id ?? "");
    const hint = hints.get(hintId);
    if (!hint) throw new MathRuntimeError("UNAVAILABLE", "hint not found", "P0002");

    const priorKey = idempotency.get(csid);
    if (priorKey) {
      if (priorKey !== hintId) throw conflict("client_submission_id reused for a different hint");
      return { hint_id: hint.hint_id, level: hint.level, body: hint.body, leakage_class: hint.leakage_class, replayed: true };
    }

    // Gating: L2 requires a prior L1 exposure for the same evaluation.
    if (hint.level === 2) {
      const l1Seen = exposures.some((e) => e.evaluation_id === hint.evaluation_id && e.level === 1);
      if (!l1Seen) throw invalid("L2 requires L1 first");
    }

    idempotency.set(csid, hintId);
    exposures.push({ evaluation_id: hint.evaluation_id, hint_id: hint.hint_id, level: hint.level, client_submission_id: csid });
    return { hint_id: hint.hint_id, level: hint.level, body: hint.body, leakage_class: hint.leakage_class };
  }

  return {
    state: { exposures },
    seedHint(hint) {
      hints.set(hint.hint_id, hint);
    },
    studentTransport(subject: string): MathRpcTransport {
      return {
        async rpc(fn, env) {
          if (fn !== "math_input") throw new MathRuntimeError("UNAUTHORIZED", "learning transport is math_input only", "42501");
          if (!subject) throw new MathRuntimeError("UNAUTHORIZED", "no authenticated subject", "42501");
          if (env.dto_version !== MATH_INPUT_DTO) throw invalid("unsupported dto_version");
          if (env.action !== "reveal_hint") throw invalid(`unsupported action ${env.action}`);
          return { dto_version: MATH_INPUT_DTO, action: env.action, result: revealHint(env.payload as Record<string, unknown>) };
        },
      };
    },
  };
}
