/**
 * MATH-6B — append-only learning-history timeline over canonical read_learning_history facts. Supports
 * more than two attempts (commercial eligibility ≠ history length). No UUIDs/leases/billing ids in the
 * presentation model; exposure is factual context, never inferred cognition.
 */

import { summarizeReevaluationDelta, type LearningDeltaView } from "./delta";
import type { IncludedReevaluation, LearningHistoryEntry, LearningHistoryResult } from "./runtime/contract";

export interface TimelineAttempt {
  attemptId: string;
  ordinal: number;
  resolveKind: string;
  submittedScope: "TARGET_STEP" | "WHOLE_LEAF";
  evaluationState: string | null;
  coreCount: number;
  exposedHintLevels: number[];
  solutionRevealed: boolean;
  referenceSolutionRevealedBeforeResolve: boolean;
  delta: LearningDeltaView | null;
  notReassessed: boolean;
}

export interface LearningTimeline {
  lineageId: string;
  attempts: TimelineAttempt[];
  included: IncludedReevaluation;
  nextCursor: { created_at: string; attempt_id: string } | null;
}

function toTimelineAttempt(entry: LearningHistoryEntry, ordinal: number): TimelineAttempt {
  const delta = summarizeReevaluationDelta(entry.reevaluation_delta);
  return {
    attemptId: entry.attempt_id,
    ordinal,
    resolveKind: entry.resolve_kind,
    submittedScope: entry.submitted_scope,
    evaluationState: entry.evaluation_state,
    coreCount: entry.core_ids.length,
    exposedHintLevels: [...entry.exposed_hint_levels].sort((a, b) => a - b),
    solutionRevealed: entry.solution_revealed,
    referenceSolutionRevealedBeforeResolve: entry.reference_solution_revealed_before_resolve,
    delta,
    notReassessed: delta?.notReassessed ?? false,
  };
}

/**
 * Build an oldest-first display timeline (Attempt 1 → 2 → 3 …) from the newest-first server page.
 * Append-only: no attempt is replaced or merged.
 */
export function buildLearningTimeline(result: LearningHistoryResult): LearningTimeline {
  const oldestFirst = [...result.attempts].reverse();
  return {
    lineageId: result.lineage_id,
    attempts: oldestFirst.map((entry, index) => toTimelineAttempt(entry, index + 1)),
    included: result.included_reevaluation,
    nextCursor: result.next_cursor,
  };
}
