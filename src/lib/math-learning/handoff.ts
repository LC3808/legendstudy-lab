/**
 * MATH-5B — MATH-6 learning-context handoff + solution-reveal context. MATH-5 never decides commercial
 * eligibility (backend/MATH-6 does) and never implies free reevaluation (MATH-5A §63–65, brief §28).
 */

import type { ReferenceProvenance } from "../math-eval/types";
import type { CoreView, HintLevel, Math6Handoff, SolutionRevealContext } from "./types";

export const RESOLVE_CTA_LABEL = "답안을 다시 작성해 보세요" as const;

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
export function resolveCtaNote(backendEligibility: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN"): string | null {
  return backendEligibility === "AVAILABLE"
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
