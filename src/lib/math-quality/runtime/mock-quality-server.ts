/**
 * MATH-7B — deterministic mock of the qlm_quality surface (TEST transport). Enforces the operator
 * gate, output-hash binding, append-only correction, idempotency, independent reviews, disagreement
 * preservation, and E1/E2. Not canonical; verifies the LAB consumer contract only.
 */

import { MathRuntimeError } from "../../math-input/runtime/errors";
import type { MathRpcTransport } from "../../math-input/runtime/transport";
import { QLM_RUNTIME_DTO } from "./contract";
import { deriveReviewState } from "../review-state";
import { validateHqMathJudgment } from "../write-validation";
import type { HqJudgmentRecord, HqMathJudgment, MathQualityCaseDetail } from "../types";

interface EvalRow {
  detail: MathQualityCaseDetail;
  judgments: HqJudgmentRecord[];
  storedJudgments: Map<string, HqMathJudgment>; // judgment_id -> payload (for correction detail)
}

export interface MockQualityServer {
  operatorTransport(reviewer: string): MathRpcTransport;
  nonOperatorTransport(): MathRpcTransport;
  seedCase(detail: MathQualityCaseDetail): void;
  deleteEvaluation(evaluationId: string): void; // E1
  deleteReviewer(reviewer: string): void; // E2
  state: { evaluations: Map<string, EvalRow> };
}

export function createMockQualityServer(): MockQualityServer {
  const evaluations = new Map<string, EvalRow>();
  const idempotency = new Map<string, { judgmentId: string; hash: string }>();
  let seq = 0;

  const denied = () => new MathRuntimeError("UNAUTHORIZED", "not a quality operator", "42501");
  const missing = () => new MathRuntimeError("UNAVAILABLE", "case not found", "P0002");
  const invalid = (m: string) => new MathRuntimeError("INVALID_OR_STALE", m, "22023");
  const conflict = (m: string) => new MathRuntimeError("CONFLICT", m, "23505");

  function submit(reviewer: string, judgment: HqMathJudgment): unknown {
    const row = evaluations.get(judgment.math_evaluation_id);
    if (!row) throw missing();

    const csid = judgment.client_submission_id;
    const hash = JSON.stringify({ ...judgment, client_submission_id: undefined });
    const prior = idempotency.get(csid);
    if (prior) {
      if (prior.hash !== hash) throw conflict("submission key reused with a different payload");
      return { judgment_id: prior.judgmentId, replayed: true };
    }

    // Hash binding first (STALE), then structural validation (fail closed).
    if (judgment.expected_output_sha256 !== row.detail.output_sha256) throw invalid("STALE_OUTPUT_HASH");
    const validation = validateHqMathJudgment(judgment, row.detail);
    if (!validation.ok) throw invalid(`invalid judgment: ${validation.issues.join(",")}`);

    // Append-only correction: supersede exactly one active judgment of the same evaluation.
    if (judgment.supersedes_judgment_id) {
      const parent = row.judgments.find((j) => j.judgment_id === judgment.supersedes_judgment_id);
      if (!parent || parent.math_evaluation_id !== judgment.math_evaluation_id) throw invalid("bad supersedes target");
      if (parent.superseded) throw conflict("parent already superseded");
      parent.superseded = true;
    }

    const judgmentId = `jud-${(seq += 1)}`;
    idempotency.set(csid, { judgmentId, hash });
    row.storedJudgments.set(judgmentId, judgment);
    row.judgments.push({
      judgment_id: judgmentId,
      math_evaluation_id: judgment.math_evaluation_id,
      reviewer_display: `reviewer:${reviewer.slice(0, 8)}`,
      rubric_version: judgment.rubric_version,
      overall_disposition: judgment.overall_disposition,
      superseded: false,
      supersedes_judgment_id: judgment.supersedes_judgment_id ?? null,
      created_at: `2026-10-03T00:00:${String(seq).padStart(2, "0")}.000Z`,
    });
    return { judgment_id: judgmentId };
  }

  function handle(reviewer: string, action: string, payload: Record<string, unknown>): unknown {
    switch (action) {
      case "list":
        return {
          dto_version: "qlm-read-v1",
          cases: [...evaluations.values()].map((r) => ({
            evaluation_id: r.detail.evaluation_id,
            completed_at: null,
            review_state: deriveReviewState(r.judgments).state,
            response_format: r.detail.response_format,
            review_status: r.detail.review_status,
          })),
          next_cursor: null,
        };
      case "detail": {
        const row = evaluations.get(String(payload.evaluation_id ?? ""));
        if (!row) throw missing();
        return { dto_version: "qlm-read-v1", detail: row.detail, judgments: row.judgments };
      }
      case "submit_judgment":
        return submit(reviewer, payload.judgment as HqMathJudgment);
      case "review_state": {
        const ids = (payload.evaluation_ids as string[]) ?? [];
        return {
          dto_version: "hq-math-read-v1",
          states: ids.map((id) => {
            const row = evaluations.get(id);
            const proj = row ? deriveReviewState(row.judgments) : { state: "UNREVIEWED", activeCount: 0, activeDispositions: [] };
            return { evaluation_id: id, review_state: proj.state, active_count: proj.activeCount, dispositions: proj.activeDispositions };
          }),
        };
      }
      case "history": {
        const row = evaluations.get(String(payload.evaluation_id ?? ""));
        if (!row) throw missing();
        return { dto_version: "hq-math-read-v1", judgments: row.judgments, next_cursor: null };
      }
      default:
        throw invalid(`unsupported qlm action ${action}`);
    }
  }

  return {
    state: { evaluations },
    seedCase(detail) {
      evaluations.set(detail.evaluation_id, { detail, judgments: [], storedJudgments: new Map() });
    },
    deleteEvaluation(evaluationId) {
      // E1: evaluation deletion cascades its Human Quality graph.
      evaluations.delete(evaluationId);
    },
    deleteReviewer(reviewer) {
      // E2: reviewer identity SET NULL on surviving reviews.
      for (const row of evaluations.values()) {
        for (const j of row.judgments) {
          if (j.reviewer_display === `reviewer:${reviewer.slice(0, 8)}`) j.reviewer_display = null;
        }
      }
    },
    operatorTransport(reviewer: string): MathRpcTransport {
      return {
        async rpc(fn, env) {
          if (fn !== "qlm_quality") throw denied();
          if (env.dto_version !== QLM_RUNTIME_DTO) throw invalid("unsupported dto_version");
          return { dto_version: QLM_RUNTIME_DTO, action: env.action, result: handle(reviewer, env.action, env.payload as Record<string, unknown>) };
        },
      };
    },
    nonOperatorTransport(): MathRpcTransport {
      return {
        async rpc() {
          throw denied();
        },
      };
    },
  };
}
