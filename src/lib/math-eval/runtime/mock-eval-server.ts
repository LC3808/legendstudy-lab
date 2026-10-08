/**
 * MATH-4B — deterministic in-memory mock of the MATH-2D math_evaluation surface (TEST transport).
 * Enforces worker-only access, lifecycle gate, run fence/lease, finalize idempotency and stale/
 * conflict rejection. Heavy structural output validation is LAB-side (validateMathEval before
 * finalize); the server emulates the fence/settlement contract, not the full SQL schema. Not canonical.
 */

import { MathRuntimeError } from "../../math-input/runtime/errors";
import type { MathRpcTransport } from "../../math-input/runtime/transport";
import { MATH_WORKER_DTO, type ClaimContext } from "./contract";

type Lifecycle = "ACTIVE" | "PENDING" | "ERASING";
type EvalState = "REQUESTED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface SeedEvaluation {
  evaluation_id: string;
  owner: string;
  context: ClaimContext;
}

interface EvalRow {
  evaluationId: string;
  owner: string;
  state: EvalState;
  leaseToken: string | null;
  outputHash: string | null;
  context: ClaimContext;
}

export interface MockEvalServerOptions {
  lifecycle?: Record<string, Lifecycle>;
}

export interface MockEvalServer {
  workerTransport(): MathRpcTransport;
  studentTransport(): MathRpcTransport;
  seedEvaluation(seed: SeedEvaluation): void;
  state: { evaluations: Map<string, EvalRow> };
}

export function createMockEvalServer(options: MockEvalServerOptions = {}): MockEvalServer {
  const evaluations = new Map<string, EvalRow>();
  const lifecycle = options.lifecycle ?? {};
  let seq = 0;

  const invalid = (m: string) => new MathRuntimeError("INVALID_OR_STALE", m, "22023");
  const conflict = (m: string) => new MathRuntimeError("CONFLICT", m, "23505");
  const denied = (m: string) => new MathRuntimeError("UNAUTHORIZED", m, "42501");

  function requireActive(owner: string): void {
    if (lifecycle[owner] === "PENDING" || lifecycle[owner] === "ERASING") {
      throw denied("account lifecycle restricted");
    }
  }

  function handle(action: string, payload: Record<string, unknown>): unknown {
    const row = evaluations.get(String(payload.evaluation_id ?? ""));
    if (!row) throw new MathRuntimeError("UNAVAILABLE", "evaluation not found", "P0002");
    requireActive(row.owner);

    switch (action) {
      case "claim": {
        if (row.state !== "REQUESTED") throw invalid("evaluation not claimable");
        row.state = "PROCESSING";
        row.leaseToken = `lease-eval-${(seq += 1)}`;
        return {
          evaluation_id: row.evaluationId,
          lease_token: row.leaseToken,
          lease_until: "2026-10-02T00:05:00.000Z",
          context: row.context,
        };
      }
      case "finalize": {
        if (row.leaseToken !== String(payload.lease_token ?? "")) throw invalid("stale lease token");
        const outputHash = JSON.stringify(payload.output ?? null);
        if (row.state === "COMPLETED") {
          if (row.outputHash === outputHash) return row.evaluationId; // idempotent
          throw conflict("changed finalize output");
        }
        if (row.state !== "PROCESSING") throw invalid("evaluation not in PROCESSING");
        row.state = "COMPLETED";
        row.outputHash = outputHash;
        return row.evaluationId;
      }
      case "fail": {
        if (row.leaseToken !== String(payload.lease_token ?? "")) throw invalid("stale lease token");
        if (row.state !== "PROCESSING" && row.state !== "FAILED") throw invalid("evaluation not failable");
        row.state = "FAILED";
        return { failed: true };
      }
      default:
        throw invalid(`unknown math_evaluation action ${action}`);
    }
  }

  return {
    state: { evaluations },
    seedEvaluation(seed) {
      evaluations.set(seed.evaluation_id, {
        evaluationId: seed.evaluation_id,
        owner: seed.owner,
        state: "REQUESTED",
        leaseToken: null,
        outputHash: null,
        context: seed.context,
      });
    },
    workerTransport(): MathRpcTransport {
      return {
        async rpc(fn, env) {
          if (fn !== "math_evaluation") throw denied("worker transport is evaluation-only");
          if (env.dto_version !== MATH_WORKER_DTO) throw invalid("unsupported dto_version");
          return { dto_version: MATH_WORKER_DTO, action: env.action, result: handle(env.action, env.payload as Record<string, unknown>) };
        },
      };
    },
    studentTransport(): MathRpcTransport {
      return {
        async rpc(fn) {
          // Students never reach the worker-only evaluation surface.
          if (fn === "math_evaluation") throw denied("students may not finalize evaluations");
          throw denied("unsupported function on student transport");
        },
      };
    },
  };
}
