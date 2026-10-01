import type {
  QualityCaseDetail,
  QualityGeneratedRewrite,
  QualityImprovement,
  QualityStudentAttempt,
} from "./contract";

/**
 * Pure, DB-agnostic view helpers for the Quality Console. They derive the small
 * amount of *presentation* logic the console needs from the `ql-read-v1`
 * consumer representation, without inventing canonical facts (task §34).
 */

/**
 * Availability semantics the UI must preserve (task §5, §11, §31, §32):
 *   - `unavailable` — the contract returned `null`/absent (not assessable here)
 *   - `empty`       — the contract returned an empty collection (assessed, none)
 *   - `present`     — a populated value
 * `empty` must never be shown as `unavailable`, and vice versa.
 */
export type AvailabilityState = "unavailable" | "empty" | "present";

export function availabilityOf(value: unknown): AvailabilityState {
  if (value === null || value === undefined) return "unavailable";
  if (Array.isArray(value)) return value.length === 0 ? "empty" : "present";
  if (typeof value === "string") return value.length === 0 ? "empty" : "present";
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length === 0 ? "empty" : "present";
  }
  return "present";
}

export interface PartitionedImprovements {
  /** Unavailable when the `improvements` group itself is `null`/absent. */
  availability: AvailabilityState;
  core: QualityImprovement[];
  nonCore: QualityImprovement[];
}

/**
 * Split improvements into CORE and NON-CORE strictly by the canonical
 * `core_focus === true` signal (task §6). Priority is ordering only and is NOT
 * used for membership; category and item count are never used either. A valid
 * case may have zero CORE items (task §17 T13).
 */
export function partitionImprovements(
  improvements: QualityImprovement[] | null | undefined,
): PartitionedImprovements {
  const availability = availabilityOf(improvements);
  if (!improvements || improvements.length === 0) {
    return { availability, core: [], nonCore: [] };
  }
  const core: QualityImprovement[] = [];
  const nonCore: QualityImprovement[] = [];
  for (const item of improvements) {
    // Prefer the deployed `is_core`; fall back to `core_focus` for legacy fixtures.
    const isCore = item.is_core ?? item.core_focus ?? false;
    if (isCore === true) core.push(item);
    else nonCore.push(item);
  }
  return { availability, core, nonCore };
}

/**
 * A generated rewrite is an AI artifact and is only "present" when a rewrite
 * object with real content exists. It is a different concept from a student
 * rewrite attempt and must never be merged with one (task §6, §17 T16).
 */
export function hasGeneratedRewrite(
  rewrite: QualityGeneratedRewrite | null | undefined,
): boolean {
  if (!rewrite) return false;
  return availabilityOf(rewrite.body) === "present" || availabilityOf(rewrite.status) === "present";
}

/**
 * Student rewrite attempts are subsequent immutable student attempts, distinct
 * from the AI generated rewrite. We surface them from `student_attempts` where a
 * `is_rewrite` marker is present, falling back to "any attempt beyond the first"
 * only as display ordering — never conflating them with the generated artifact.
 */
export function studentRewriteAttempts(
  attempts: QualityStudentAttempt[] | null | undefined,
): QualityStudentAttempt[] {
  if (!attempts || attempts.length === 0) return [];
  const flagged = attempts.filter((attempt) => attempt.is_rewrite === true);
  return flagged;
}

/**
 * Convenience selector used by the detail view. Returns each documented group
 * together with its availability state so the renderer can show explicit
 * unavailable vs empty vs present states without re-deriving the rule.
 */
export function detailGroupAvailability(detail: QualityCaseDetail) {
  return {
    questionContext: availabilityOf(detail.question_context),
    studentSubmission: availabilityOf(detail.student_submission),
    answerFullText: availabilityOf(detail.student_submission?.answer_full_text ?? null),
    evaluation: availabilityOf(detail.evaluation),
    strengths: availabilityOf(detail.evaluation?.strengths ?? null),
    dimensions: availabilityOf(detail.dimensions),
    improvements: availabilityOf(detail.improvements),
    scaffolding: availabilityOf(detail.scaffolding_availability),
    sentenceFeedback: availabilityOf(detail.sentence_feedback),
    rewriteChecklist: availabilityOf(detail.evaluation?.rewrite_checklist ?? null),
    studentAttempts: availabilityOf(detail.student_attempts),
    generatedRewrite: hasGeneratedRewrite(detail.generated_rewrite) ? "present" : availabilityOf(detail.generated_rewrite),
    officialEvidence: availabilityOf(detail.official_evidence),
    evidenceLinks: availabilityOf(detail.evaluation_evidence_links),
    historyContext: availabilityOf(detail.history_context),
    previousReview: availabilityOf(detail.previous_review_representation),
    provenance: availabilityOf(detail.provenance),
    processing: availabilityOf(detail.processing ?? detail.latest_processing),
    sessionEvaluations: availabilityOf(detail.session_evaluations),
  } as const;
}
