/**
 * MATH-5B-R — deterministic in-memory mock of the MATH-2E `math_learning` surface (TEST transport).
 * Serves read_learning_state / reveal_hint / reveal_solution with server-authoritative availability,
 * progressive gating (L2 requires L1 for the same CORE), idempotency, lifecycle gate, and the
 * included-reevaluation projection (expiry/eligibility are server facts — never client-recomputed).
 * Not canonical.
 */

import { MathRuntimeError } from "../../math-input/runtime/errors";
import type { MathRpcTransport } from "../../math-input/runtime/transport";
import {
  MATH_LEARNING_DTO,
  type IncludedReevaluation,
  type LearningState,
  type SolutionProvenance,
  type SolutionTarget,
} from "./contract";
import type { HintLevel } from "../types";

type Lifecycle = "ACTIVE" | "PENDING" | "ERASING";

interface HintBody {
  hintId: string;
  coreId: string;
  level: HintLevel;
  body: string;
}
interface SolutionBody {
  solutionId: string | null;
  target: SolutionTarget;
  provenance: SolutionProvenance;
  physicalOrigin: string;
  body: string;
}

export interface SeedLearning {
  owner: string;
  state: LearningState;
  hintBodies: HintBody[];
  solutionBodies: SolutionBody[];
}

interface EvalRecord {
  owner: string;
  state: LearningState;
  hintBodies: Map<string, HintBody>;
  solutionBodies: SolutionBody[];
  hintExposures: Array<{ hintId: string; level: HintLevel; coreId: string; key: string }>;
  solutionExposures: Array<{ key: string; target: SolutionTarget; solutionId: string | null; exposureId: string }>;
  hintIdem: Map<string, string>; // client_submission_id -> hint_id
  solutionIdem: Map<string, string>; // client_submission_id -> `${target}:${solution_id ?? ""}`
}

export interface MockLearningServer {
  studentTransport(subject: string): MathRpcTransport;
  seedLearning(seed: SeedLearning): void;
  state: { evaluations: Map<string, EvalRecord> };
}

export function createMockLearningServer(options: { lifecycle?: Record<string, Lifecycle> } = {}): MockLearningServer {
  const evaluations = new Map<string, EvalRecord>();
  const lifecycle = options.lifecycle ?? {};
  let seq = 0;

  const denied = (m: string) => new MathRuntimeError("UNAUTHORIZED", m, "42501");
  const missing = () => new MathRuntimeError("UNAVAILABLE", "not found or not owned", "P0002");
  const invalid = (m: string) => new MathRuntimeError("INVALID_OR_STALE", m, "22023");
  const conflict = (m: string) => new MathRuntimeError("CONFLICT", m, "23505");

  function ownedRecord(subject: string, evaluationId: unknown): EvalRecord {
    const record = typeof evaluationId === "string" ? evaluations.get(evaluationId) : undefined;
    if (!record || record.owner !== subject) throw missing();
    if (lifecycle[record.owner] === "PENDING" || lifecycle[record.owner] === "ERASING") throw denied("lifecycle restricted");
    return record;
  }

  function projectState(record: EvalRecord): LearningState {
    const exposedByCore = new Map<string, Set<HintLevel>>();
    for (const e of record.hintExposures) {
      const set = exposedByCore.get(e.coreId) ?? new Set<HintLevel>();
      set.add(e.level);
      exposedByCore.set(e.coreId, set);
    }
    const revealedHintIds = new Set(record.hintExposures.map((e) => e.hintId));
    const revealedSolutionKeys = new Set(record.solutionExposures.map((e) => `${e.target}:${e.solutionId ?? ""}`));

    return {
      ...record.state,
      hints: record.state.hints.map((h) => {
        const coreExposed = exposedByCore.get(h.core_id) ?? new Set<HintLevel>();
        const canReveal = h.level === 2 ? coreExposed.has(1) : true;
        return { ...h, revealed: revealedHintIds.has(h.hint_id), can_reveal: h.available && canReveal };
      }),
      solutions: record.state.solutions.map((s) => ({
        ...s,
        revealed: revealedSolutionKeys.has(`${s.target}:${s.solution_id ?? ""}`),
      })),
    };
  }

  function handle(subject: string, action: string, payload: Record<string, unknown>): unknown {
    switch (action) {
      case "read_learning_state": {
        const record = ownedRecord(subject, payload.evaluation_id);
        return projectState(record);
      }

      case "reveal_hint": {
        const record = ownedRecord(subject, payload.evaluation_id);
        const hintId = String(payload.hint_id ?? "");
        const key = String(payload.client_submission_id ?? "");
        const hint = record.hintBodies.get(hintId);
        if (!hint) throw missing();
        if (payload.level !== hint.level) throw invalid("level mismatch");

        const prior = record.hintIdem.get(key);
        if (prior) {
          if (prior !== hintId) throw conflict("client_submission_id reused for a different hint");
          return { hint_id: hint.hintId, level: hint.level, body: hint.body, replayed: true };
        }
        // Gating: L2 requires a prior L1 delivery for the same CORE.
        if (hint.level === 2) {
          const l1 = record.hintExposures.some((e) => e.coreId === hint.coreId && e.level === 1);
          if (!l1) throw invalid("L2 requires L1 for the same CORE");
        }
        record.hintIdem.set(key, hintId);
        record.hintExposures.push({ hintId, level: hint.level, coreId: hint.coreId, key });
        return { hint_id: hint.hintId, level: hint.level, body: hint.body };
      }

      case "reveal_solution": {
        const record = ownedRecord(subject, payload.evaluation_id);
        const target = payload.target as SolutionTarget;
        const key = String(payload.client_submission_id ?? "");
        const solutionId = target === "REFERENCE" ? String(payload.solution_id ?? "") : null;
        const sol = record.solutionBodies.find(
          (s) => s.target === target && (target === "GENERATED" || s.solutionId === solutionId),
        );
        if (!sol) throw missing();

        const idemValue = `${target}:${solutionId ?? ""}`;
        const prior = record.solutionIdem.get(key);
        if (prior) {
          if (prior !== idemValue) throw conflict("client_submission_id reused for a different solution");
          const existing = record.solutionExposures.find((e) => e.key === key)!;
          return solutionResult(existing.exposureId, record.state.evaluation_id, sol, true);
        }
        const exposureId = `exp-${(seq += 1)}`;
        record.solutionIdem.set(key, idemValue);
        record.solutionExposures.push({ key, target, solutionId, exposureId });
        return solutionResult(exposureId, record.state.evaluation_id, sol, false);
      }

      default:
        // create_resolve_attempt / request_reevaluation / read_learning_history are MATH-6B.
        throw invalid(`unsupported math_learning action ${action}`);
    }
  }

  function solutionResult(exposureId: string, evaluationId: string, sol: SolutionBody, replayed: boolean) {
    return {
      exposure_id: exposureId,
      evaluation_id: evaluationId,
      solution_id: sol.solutionId,
      target: sol.target,
      delivered_at: "2026-10-02T00:00:00.000Z",
      provenance: sol.provenance,
      physical_origin: sol.physicalOrigin,
      body: sol.body,
      learning_context: "REFERENCE_SOLUTION_REVEALED" as const,
      replayed,
    };
  }

  return {
    state: { evaluations },
    seedLearning(seed) {
      evaluations.set(seed.state.evaluation_id, {
        owner: seed.owner,
        state: seed.state,
        hintBodies: new Map(seed.hintBodies.map((h) => [h.hintId, h])),
        solutionBodies: seed.solutionBodies,
        hintExposures: [],
        solutionExposures: [],
        hintIdem: new Map(),
        solutionIdem: new Map(),
      });
    },
    studentTransport(subject: string): MathRpcTransport {
      return {
        async rpc(fn, env) {
          if (fn !== "math_learning") throw denied("learning transport is math_learning only");
          if (!subject) throw denied("no authenticated subject");
          if (env.dto_version !== MATH_LEARNING_DTO) throw invalid("unsupported dto_version");
          return { dto_version: MATH_LEARNING_DTO, action: env.action, result: handle(subject, env.action, env.payload as Record<string, unknown>) };
        },
      };
    },
  };
}

/** Helper: a minimal valid IncludedReevaluation projection for seeding. */
export function includedReevaluation(overrides: Partial<IncludedReevaluation> = {}): IncludedReevaluation {
  return {
    status: "AVAILABLE",
    eligible: true,
    included_count: 1,
    initial_evaluation_id: "eval-1",
    expires_at: "2026-10-16T00:00:00.000Z",
    as_of: "2026-10-02T00:00:00.000Z",
    request_route: "math_learning/request_reevaluation",
    ...overrides,
  };
}
