/**
 * MATH-5B — MATH-6 learning-context handoff + solution-reveal context. MATH-5 never decides commercial
 * eligibility (backend/MATH-6 does) and never implies free reevaluation (MATH-5A §63–65, brief §28).
 */

import type { ReferenceProvenance } from "../math-eval/types";
import type { CorePresentation, CoreView, HintLevel, Math6Handoff, SolutionRevealContext } from "./types";
import type { IncludedReevaluationStatus, LearningState } from "./runtime/contract";

export const RESOLVE_CTA_LABEL = "답안을 다시 작성해 보세요" as const;

/** MATH-6 handoff assembled from the server-authoritative LearningState (MATH-5B-R). */
export interface Math6HandoffState {
  evaluationId: string;
  leafId: string;
  lineageId: string;
  priorAttemptId: string | null;
  priorEvaluationId: string | null;
  priorCore: CorePresentation | null;
  hintLevelsExposed: number[];
  referenceSolutionRevealed: boolean;
  /** Server-authoritative; the client never recomputes the 336-hour window. */
  includedStatus: IncludedReevaluationStatus;
  includedExpiresAt: string | null;
  resolveKinds: string[];
  resolveEligibility: "BACKEND_AUTHORITY";
  resolveCtaLabel: string;
}

export function buildMath6HandoffFromState(state: LearningState): Math6HandoffState {
  const firstCore = [...state.core].sort((a, b) => a.position - b.position)[0];
  const priorCore: CorePresentation | null = firstCore
    ? {
        coreId: firstCore.core_id,
        errorId: firstCore.error_id,
        stepId: firstCore.step_id,
        title: firstCore.title,
        diagnosis: firstCore.diagnosis,
        why: firstCore.why,
        nextAction: firstCore.next_action,
      }
    : null;
  return {
    evaluationId: state.evaluation_id,
    leafId: state.leaf_id,
    lineageId: state.lineage_id,
    priorAttemptId: state.prior_attempt_id,
    priorEvaluationId: state.prior_evaluation_id,
    priorCore,
    hintLevelsExposed: [...new Set(state.hint_levels_before_resolve)].sort((a, b) => a - b),
    referenceSolutionRevealed:
      state.reference_solution_revealed_before_resolve || state.solutions.some((s) => s.revealed),
    includedStatus: state.included_reevaluation.status,
    includedExpiresAt: state.included_reevaluation.expires_at,
    resolveKinds: state.resolve_kinds,
    resolveEligibility: "BACKEND_AUTHORITY",
    resolveCtaLabel: RESOLVE_CTA_LABEL,
  };
}

export function buildMath6Handoff(params: {
  evaluationId: string;
  leafId: string;
  coreView: CoreView;
  exposedLevels: ReadonlySet<HintLevel>;
  referenceSolutionRevealed: boolean;
}): Math6Handoff {
  return {
    evaluationId: params.evaluationId,
    leafId: params.leafId,
    priorCore: params.coreView.primary,
    hintLevelsExposed: [...params.exposedLevels].sort((a, b) => a - b),
    referenceSolutionRevealed: params.referenceSolutionRevealed,
    resolveEligibility: "BACKEND_AUTHORITY",
    resolveCtaLabel: RESOLVE_CTA_LABEL,
  };
}

/**
 * The re-solve CTA may note the included-reevaluation window ONLY when the backend reports
 * eligibility available; otherwise it must not promise free reevaluation (brief §28, H33).
 */
export function resolveCtaNote(includedStatus: IncludedReevaluationStatus | "UNKNOWN"): string | null {
  return includedStatus === "AVAILABLE"
    ? "14일 이내 재첨삭에는 Credit이 추가로 차감되지 않습니다."
    : null;
}

export function buildSolutionRevealContext(params: {
  evaluationId: string;
  provenance: ReferenceProvenance;
  earlyReveal: boolean;
  atIso: string;
}): SolutionRevealContext {
  return {
    evaluationId: params.evaluationId,
    earlyReveal: params.earlyReveal,
    provenance: params.provenance,
    atIso: params.atIso,
  };
}
