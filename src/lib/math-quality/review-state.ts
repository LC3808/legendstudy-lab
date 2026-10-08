/**
 * MATH-7B — derive review-state from the append-only judgment history. Disagreement is PRESERVED
 * (never averaged into a single manufactured truth). Independent reviews coexist; a correction
 * supersedes its specific parent only. No numeric consensus score.
 */

import type { HqJudgmentRecord, HqReviewState } from "./types";

export interface ReviewStateProjection {
  state: HqReviewState;
  activeCount: number;
  /** Distinct active dispositions (surfaced on disagreement). */
  activeDispositions: string[];
  /** Pseudonymous reviewer displays for active heads; null = deleted reviewer (E2). */
  reviewers: Array<string | null>;
}

const ACCEPTABLE = new Set(["PASS", "PASS_WITH_NOTES"]);

export function deriveReviewState(judgments: HqJudgmentRecord[]): ReviewStateProjection {
  const active = judgments.filter((j) => !j.superseded);
  const hasCorrection = judgments.some((j) => j.supersedes_judgment_id !== null);

  if (active.length === 0) {
    return { state: "UNREVIEWED", activeCount: 0, activeDispositions: [], reviewers: [] };
  }

  const dispositions = [...new Set(active.map((j) => j.overall_disposition))];
  const reviewers = active.map((j) => j.reviewer_display);

  // Incompatible rubric major versions cannot be compared for consensus.
  const majors = new Set(active.map((j) => j.rubric_version.split(".")[0]));
  if (majors.size > 1) {
    return { state: "NOT_COMPARABLE", activeCount: active.length, activeDispositions: dispositions, reviewers };
  }

  if (active.length === 1) {
    return {
      state: hasCorrection ? "CORRECTED" : "SINGLE_REVIEW",
      activeCount: 1,
      activeDispositions: dispositions,
      reviewers,
    };
  }

  // ≥2 active independent reviews: materially different dispositions → DISAGREEMENT (preserved).
  const acceptable = active.filter((j) => ACCEPTABLE.has(j.overall_disposition)).length;
  const materiallyDifferent = acceptable > 0 && acceptable < active.length;
  return {
    state: materiallyDifferent ? "DISAGREEMENT" : "MULTIPLE_REVIEWS",
    activeCount: active.length,
    activeDispositions: dispositions,
    reviewers,
  };
}
