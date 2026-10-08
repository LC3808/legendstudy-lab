/**
 * MATH-6B — reevaluation learning-delta presentation over canonical MATH-2E/MATH-4 delta facts.
 * Answers "무엇이 달라졌나" — not a numeric score. Answer vs reasoning axes stay separate; propagated
 * consequences are not re-listed as independent weaknesses; STEP_RETRY downstream stays NOT_REASSESSED.
 */

import type { ReevaluationDelta, ReevaluationDeltaItem, ReevaluationDeltaKind } from "./runtime/contract";

export interface LearningDeltaView {
  /** Improvements worth surfacing first. */
  resolved: ReevaluationDeltaItem[];
  /** Newly identified material issues (independent roots). */
  newIssues: ReevaluationDeltaItem[];
  /** Material issues that still remain. */
  persisting: ReevaluationDeltaItem[];
  answerChanged: boolean;
  answerNowCorrect: boolean;
  justificationImproved: boolean;
  pathValidityChanged: boolean;
  noMaterialChange: boolean;
  /** True when a STEP_RETRY left downstream scope unassessed. */
  notReassessed: boolean;
  summary: string;
}

const RESOLVED_KINDS: ReadonlySet<ReevaluationDeltaKind> = new Set<ReevaluationDeltaKind>([
  "CORE_CORRECTED",
  "ROOT_ERROR_REMOVED",
  "PROPAGATED_ERROR_REMOVED",
  "ANSWER_NOW_CORRECT",
  "JUSTIFICATION_IMPROVED",
]);

export function summarizeReevaluationDelta(delta: ReevaluationDelta | null): LearningDeltaView | null {
  if (!delta) return null;
  const items = delta.delta ?? [];
  const has = (kind: ReevaluationDeltaKind) => items.some((i) => i.kind === kind);

  return {
    resolved: items.filter((i) => RESOLVED_KINDS.has(i.kind)),
    newIssues: items.filter((i) => i.kind === "NEW_INDEPENDENT_ERROR"),
    persisting: items.filter((i) => i.kind === "ROOT_ERROR_REMAINS"),
    answerChanged: has("ANSWER_CHANGED") || has("ANSWER_NOW_CORRECT"),
    answerNowCorrect: has("ANSWER_NOW_CORRECT"),
    justificationImproved: has("JUSTIFICATION_IMPROVED"),
    pathValidityChanged: has("PATH_VALIDITY_CHANGED"),
    noMaterialChange: has("NO_MATERIAL_CHANGE") || items.length === 0,
    notReassessed: delta.downstream === "NOT_REASSESSED",
    summary: delta.summary,
  };
}

/** Did the student remove a prior root but introduce a new one? (both must be shown, §25) */
export function rootRemovedWithNewRoot(view: LearningDeltaView): boolean {
  return view.resolved.some((i) => i.kind === "ROOT_ERROR_REMOVED") && view.newIssues.length > 0;
}
