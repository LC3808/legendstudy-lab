/**
 * MATH-3B-R — deterministic in-memory mock of the MATH-2D runtime (TEST transport). It emulates the
 * authoritative server semantics (ownership, lifecycle gate, worker-only extraction, server-derived
 * readiness, idempotency, stale/wrong-attempt rejection) so the LAB binding is verifiable WITHOUT any
 * live provider, network, Production DB, or real student data. It is not a canonical contract.
 */

import {
  MATH_EXTRACTION_DTO,
  MATH_INPUT_DTO,
  type RuntimeEnvelope,
  type WireCandidateRegion,
  type WireExtractionRegion,
} from "./contract";
import { MathRuntimeError } from "./errors";
import type { MathRpcTransport } from "./transport";

type LifecycleStatus = "ACTIVE" | "PENDING" | "ERASING";
type RunState = "PROCESSING" | "COMPLETED" | "CONFIRMED" | "FAILED";

interface Attempt {
  attemptId: string;
  owner: string;
  leafId: string;
  kind: string;
  inputKind: string;
  typedAnswer?: string;
  core: string;
}
interface ArtifactRow {
  artifact_id: string;
  position: number;
  media_type: string;
  metaHash: string;
}
interface RunRow {
  run_id: string;
  attemptId: string;
  state: RunState;
  leaseToken: string;
  regions: WireCandidateRegion[];
  outputHash: string | null;
  predecessorId: string | null;
  confirmPayloadHash: string | null;
}

export interface MockServerOptions {
  lifecycle?: Record<string, LifecycleStatus>;
}

const WRITE_ACTIONS = new Set(["create_attempt", "register_evidence", "confirm_extraction"]);
const MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

export interface MockMathServer {
  studentTransport(subject: string): MathRpcTransport;
  workerTransport(): MathRpcTransport;
  state: {
    attempts: Map<string, Attempt>;
  };
}

export function createMockMathServer(options: MockServerOptions = {}): MockMathServer {
  const attempts = new Map<string, Attempt>();
  const createIdem = new Map<string, string>();
  const artifacts = new Map<string, ArtifactRow[]>();
  const runs = new Map<string, RunRow[]>();
  const lifecycle = options.lifecycle ?? {};
  let seq = 0;
  const id = (p: string) => `${p}-${(seq += 1)}`;

  const ownedAttempt = (subject: string, attemptId: unknown): Attempt => {
    const attempt = typeof attemptId === "string" ? attempts.get(attemptId) : undefined;
    if (!attempt || attempt.owner !== subject) {
      throw new MathRuntimeError("UNAVAILABLE", "attempt not found", "P0002");
    }
    return attempt;
  };

  const invalid = (msg: string) => new MathRuntimeError("INVALID_OR_STALE", msg, "22023");
  const conflict = (msg: string) => new MathRuntimeError("CONFLICT", msg, "23505");

  function handleInput(subject: string, action: string, payload: Record<string, unknown>): unknown {
    if (WRITE_ACTIONS.has(action) && (lifecycle[subject] === "PENDING" || lifecycle[subject] === "ERASING")) {
      throw new MathRuntimeError("UNAUTHORIZED", "account lifecycle restricted", "42501");
    }

    switch (action) {
      case "create_attempt": {
        const csid = String(payload.client_submission_id ?? "");
        const leafId = String(payload.leaf_id ?? "");
        const kind = String(payload.kind ?? "");
        const inputKind = String(payload.input_kind ?? "");
        if (!csid || !leafId || !kind || !inputKind) throw invalid("missing create_attempt fields");
        const typedAnswer = payload.typed_answer === undefined ? undefined : String(payload.typed_answer);
        if (inputKind === "TYPED" && (!typedAnswer || typedAnswer.trim() === "" || typedAnswer.length > 30000)) {
          throw invalid("TYPED requires nonblank typed_answer ≤30000");
        }
        const core = JSON.stringify({ leafId, kind, inputKind, typedAnswer: typedAnswer ?? null });
        const existingId = createIdem.get(csid);
        if (existingId) {
          const existing = attempts.get(existingId)!;
          if (existing.core !== core) throw conflict("client_submission_id payload conflict");
          return { attempt_id: existingId };
        }
        const attemptId = id("att");
        attempts.set(attemptId, { attemptId, owner: subject, leafId, kind, inputKind, typedAnswer, core });
        createIdem.set(csid, attemptId);
        artifacts.set(attemptId, []);
        runs.set(attemptId, []);
        return { attempt_id: attemptId };
      }

      case "register_evidence": {
        const attempt = ownedAttempt(subject, payload.attempt_id);
        const meta = (payload.metadata ?? {}) as Record<string, unknown>;
        const position = meta.position;
        if (typeof position !== "number" || !Number.isInteger(position) || position <= 0) throw invalid("bad position");
        if (typeof meta.media_type !== "string" || !MEDIA_TYPES.has(meta.media_type)) throw invalid("bad media_type");
        if (typeof meta.byte_size !== "number" || meta.byte_size < 1 || meta.byte_size > 20_971_520) throw invalid("bad byte_size");
        const list = artifacts.get(attempt.attemptId)!;
        const metaHash = JSON.stringify(meta);
        const atPosition = list.find((a) => a.position === position);
        if (atPosition) {
          if (atPosition.metaHash === metaHash) {
            return { artifact_id: atPosition.artifact_id, storage_state: "PENDING_UPLOAD", upload_available: false };
          }
          throw conflict("changed metadata at same position");
        }
        if (list.length >= 20) throw invalid("too many artifacts");
        const artifactId = id("art");
        list.push({ artifact_id: artifactId, position, media_type: meta.media_type, metaHash });
        return { artifact_id: artifactId, storage_state: "PENDING_UPLOAD", upload_available: false };
      }

      case "confirm_extraction": {
        const attempt = ownedAttempt(subject, payload.attempt_id);
        const runId = String(payload.run_id ?? "");
        const attemptRuns = runs.get(attempt.attemptId)!;
        const runIndex = attemptRuns.findIndex((r) => r.run_id === runId);
        if (runIndex === -1) throw invalid("run not found on attempt"); // covers wrong/foreign attempt
        const run = attemptRuns[runIndex];
        // A newer *claim* supersedes the candidate; its own CONFIRMED successor does not.
        const supersededByNewClaim = attemptRuns.slice(runIndex + 1).some((r) => r.predecessorId !== run.run_id);
        if (run.state !== "COMPLETED" || supersededByNewClaim) throw invalid("stale extraction version");
        const regions = payload.regions;
        if (!Array.isArray(regions) || regions.length > 100) throw invalid("bad regions");
        for (const r of regions as Record<string, unknown>[]) {
          const keys = Object.keys(r).sort().join(",");
          if (keys !== "normalized_math,raw_text,region_id") throw invalid("region shape");
          if (String(r.raw_text).length > 10000 || String(r.normalized_math).length > 10000) throw invalid("region too long");
        }
        const confirmedIds = new Set((regions as { region_id: string }[]).map((r) => r.region_id));
        for (const candidateRegion of run.regions) {
          if (candidateRegion.uncertain && !confirmedIds.has(candidateRegion.region_id)) {
            throw invalid("uncertain region not confirmed");
          }
        }
        const payloadHash = JSON.stringify(regions);
        if (run.confirmPayloadHash && run.confirmPayloadHash === payloadHash) {
          const confirmed = attemptRuns.find((r) => r.predecessorId === run.run_id && r.state === "CONFIRMED");
          if (confirmed) return { confirmed_run_id: confirmed.run_id };
        }
        if (run.confirmPayloadHash && run.confirmPayloadHash !== payloadHash) {
          throw conflict("changed confirmation payload");
        }
        const confirmedRunId = id("run");
        run.confirmPayloadHash = payloadHash;
        attemptRuns.push({
          run_id: confirmedRunId,
          attemptId: attempt.attemptId,
          state: "CONFIRMED",
          leaseToken: "",
          regions: run.regions.map((cr) => ({ ...cr, uncertain: false })),
          outputHash: null,
          predecessorId: run.run_id,
          confirmPayloadHash: payloadHash,
        });
        return { confirmed_run_id: confirmedRunId };
      }

      case "read_input": {
        const attempt = ownedAttempt(subject, payload.attempt_id);
        return readInputState(attempt);
      }

      default:
        throw invalid(`unknown math_input action ${action}`);
    }
  }

  function readInputState(attempt: Attempt): unknown {
    const base = {
      attempt: { attempt_id: attempt.attemptId, kind: attempt.kind, input_kind: attempt.inputKind },
      artifacts: (artifacts.get(attempt.attemptId) ?? []).map((a) => ({ artifact_id: a.artifact_id, position: a.position })),
      candidate: null as Record<string, unknown> | null,
      candidate_regions: [] as WireCandidateRegion[],
      confirmed_regions: [] as WireCandidateRegion[],
      selected_extraction_id: null as string | null,
    };

    if (attempt.inputKind === "TYPED") {
      return { ...base, input_state: "READY_FOR_EVALUATION", can_request_evaluation: true };
    }

    const attemptRuns = runs.get(attempt.attemptId) ?? [];
    const list = artifacts.get(attempt.attemptId) ?? [];
    if (list.length === 0) return { ...base, input_state: "INPUT_REQUIRED", can_request_evaluation: false };

    const confirmed = [...attemptRuns].reverse().find((r) => r.state === "CONFIRMED");
    if (confirmed) {
      return {
        ...base,
        input_state: "READY_FOR_EVALUATION",
        can_request_evaluation: true,
        selected_extraction_id: confirmed.run_id,
        confirmed_regions: confirmed.regions,
      };
    }
    const completed = [...attemptRuns].reverse().find((r) => r.state === "COMPLETED");
    if (completed) {
      const hasUncertain = completed.regions.some((r) => r.uncertain);
      return {
        ...base,
        input_state: hasUncertain ? "CONFIRMATION_REQUIRED" : "READY_FOR_EVALUATION",
        can_request_evaluation: !hasUncertain,
        selected_extraction_id: hasUncertain ? null : completed.run_id,
        candidate: { run_id: completed.run_id },
        candidate_regions: completed.regions,
      };
    }
    const processing = attemptRuns.some((r) => r.state === "PROCESSING");
    return {
      ...base,
      input_state: processing ? "EXTRACTION_PROCESSING" : "INPUT_REQUIRED",
      can_request_evaluation: false,
    };
  }

  function handleExtraction(action: string, payload: Record<string, unknown>): unknown {
    switch (action) {
      case "claim": {
        const attempt = attempts.get(String(payload.attempt_id ?? ""));
        if (!attempt) throw new MathRuntimeError("UNAVAILABLE", "attempt not found", "P0002");
        const attemptRuns = runs.get(attempt.attemptId)!;
        if (attemptRuns.some((r) => r.state === "PROCESSING")) throw conflict("live claim exists");
        const runId = id("run");
        const leaseToken = `lease-${runId}`;
        attemptRuns.push({
          run_id: runId,
          attemptId: attempt.attemptId,
          state: "PROCESSING",
          leaseToken,
          regions: [],
          outputHash: null,
          predecessorId: null,
          confirmPayloadHash: null,
        });
        return {
          run_id: runId,
          lease_token: leaseToken,
          lease_until: "2026-10-02T00:05:00.000Z",
          artifacts: (artifacts.get(attempt.attemptId) ?? []).map((a) => ({
            artifact_id: a.artifact_id,
            position: a.position,
            media_type: a.media_type,
          })),
          evidence: { bucket: "math-private", note: "server-owned; not a browser DTO" },
        };
      }

      case "finalize": {
        const run = findRun(String(payload.run_id ?? ""));
        if (!run) throw invalid("run not found");
        if (run.leaseToken !== String(payload.lease_token ?? "")) throw invalid("stale lease token");
        const output = (payload.output ?? {}) as Record<string, unknown>;
        const keys = Object.keys(output).sort().join(",");
        if (keys !== "model,model_version,provider,regions") throw invalid("bad output keys");
        const regions = output.regions;
        if (!Array.isArray(regions) || regions.length < 1 || regions.length > 100) throw invalid("bad regions");
        const outputHash = JSON.stringify(output);
        if (run.state === "COMPLETED") {
          if (run.outputHash === outputHash) return { run_id: run.run_id };
          throw conflict("changed finalize output");
        }
        run.state = "COMPLETED";
        run.outputHash = outputHash;
        run.regions = (regions as WireExtractionRegion[]).map((r, i) => ({
          ...r,
          region_id: `${run.run_id}:r${i}`,
        }));
        return { run_id: run.run_id };
      }

      case "fail": {
        const run = findRun(String(payload.run_id ?? ""));
        if (!run) throw invalid("run not found");
        if (run.leaseToken !== String(payload.lease_token ?? "")) throw invalid("stale lease token");
        run.state = "FAILED";
        return { failed: true };
      }

      default:
        throw invalid(`unknown math_extraction action ${action}`);
    }
  }

  function findRun(runId: string): RunRow | undefined {
    for (const list of runs.values()) {
      const found = list.find((r) => r.run_id === runId);
      if (found) return found;
    }
    return undefined;
  }

  function validateEnvelope(env: RuntimeEnvelope, expectedDto: string): void {
    if (env.dto_version !== expectedDto) throw invalid("unsupported dto_version");
    if (typeof env.action !== "string" || typeof env.payload !== "object" || env.payload === null) {
      throw invalid("malformed envelope");
    }
  }

  return {
    state: { attempts },
    studentTransport(subject: string): MathRpcTransport {
      return {
        async rpc(fn, env) {
          if (fn !== "math_input") throw new MathRuntimeError("UNAUTHORIZED", "students may not call the worker surface", "42501");
          if (!subject) throw new MathRuntimeError("UNAUTHORIZED", "no authenticated subject", "42501");
          validateEnvelope(env, MATH_INPUT_DTO);
          return { dto_version: MATH_INPUT_DTO, action: env.action, result: handleInput(subject, env.action, env.payload as Record<string, unknown>) };
        },
      };
    },
    workerTransport(): MathRpcTransport {
      return {
        async rpc(fn, env) {
          if (fn !== "math_extraction") throw new MathRuntimeError("UNAUTHORIZED", "worker transport is extraction-only", "42501");
          validateEnvelope(env, MATH_EXTRACTION_DTO);
          return { dto_version: MATH_EXTRACTION_DTO, action: env.action, result: handleExtraction(env.action, env.payload as Record<string, unknown>) };
        },
      };
    },
  };
}
