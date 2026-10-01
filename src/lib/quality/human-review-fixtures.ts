import { HQ_READ_DTO_VERSION } from "./human-review-contract";
import type { QualityCaseDetail } from "./contract";

/**
 * SYNTHETIC HQP test/dev fixtures. Not Production data; never a fallback, never
 * auto-inserted. No real student answer, response body, or credential.
 */

const EVAL_A = "11111111-1111-1111-1111-111111111111";

/** ql_review_state response covering several states + NOT_FOUND. */
export const hqReviewStateFixture = {
  dto_version: HQ_READ_DTO_VERSION,
  cases: [
    { evaluation_id: EVAL_A, availability: "AVAILABLE", human_review_state: "REVIEWED_WITH_CONCERNS", active_count: 1, total_count: 2, latest_human_reviewed_at: "2026-10-01T05:00:00.000Z", has_material_issue: true, comparison_status: "COMPARABLE", consensus_bucket: "WITH_CONCERNS" },
    { evaluation_id: "22222222-2222-2222-2222-222222222222", availability: "AVAILABLE", human_review_state: "UNREVIEWED", active_count: 0, total_count: 0, latest_human_reviewed_at: null, has_material_issue: false, comparison_status: "COMPARABLE", consensus_bucket: null },
    { evaluation_id: "33333333-3333-3333-3333-333333333333", availability: "AVAILABLE", human_review_state: "DISAGREEMENT", active_count: 2, total_count: 2, latest_human_reviewed_at: "2026-10-01T06:00:00.000Z", has_material_issue: true, comparison_status: "COMPARABLE", consensus_bucket: null },
    { evaluation_id: "44444444-4444-4444-4444-444444444444", availability: "NOT_FOUND" },
  ],
} as const;

/** ql_list_human_judgments response: a correction chain + an independent review + deleted reviewer. */
export const hqJudgmentPageFixture = {
  dto_version: HQ_READ_DTO_VERSION,
  judgments: [
    {
      id: "jjjjjjj2-0000-0000-0000-000000000002",
      evaluation_id: EVAL_A,
      reviewer_user_id: "0000aaaa-0000-0000-0000-000000000001",
      reviewer_state: "AVAILABLE",
      is_active: true,
      rubric_version: "hq-rubric-v1",
      overall_disposition: "NEEDS_REVIEW",
      rubric_result: { diagnosis: "CONCERN", core_priority: "OK", actionability: "OK", evidence_adherence: "OK", stance_preservation: "OK", hallucination_absence: "OK", sentence_feedback: "NA", progression: "NA", generated_rewrite: "OK" },
      selection_reason: "EARLY_CENSUS",
      recommended_action: "MONITOR",
      summary_note: "진단 근거 재확인 필요",
      supersedes_judgment_id: "jjjjjjj1-0000-0000-0000-000000000001",
      created_at: "2026-10-01T05:00:00.000Z",
      findings: [
        { id: "f1", issue_category: "EVIDENCE_MISREAD", severity: "MATERIAL", target_kind: "DIMENSION", target_ref: { dimension_id: "dddddddd-0000-0000-0000-000000000001" }, note: "근거 2 오독" },
      ],
    },
    {
      id: "jjjjjjj1-0000-0000-0000-000000000001",
      evaluation_id: EVAL_A,
      reviewer_user_id: null,
      reviewer_state: "DELETED_OR_UNAVAILABLE",
      is_active: false,
      rubric_version: "hq-rubric-v1",
      overall_disposition: "PASS_WITH_NOTES",
      rubric_result: { diagnosis: "OK", core_priority: "OK", actionability: "OK", evidence_adherence: "OK", stance_preservation: "OK", hallucination_absence: "OK", sentence_feedback: "NA", progression: "NA", generated_rewrite: "OK" },
      selection_reason: "EARLY_CENSUS",
      recommended_action: "NONE",
      summary_note: null,
      supersedes_judgment_id: null,
      created_at: "2026-10-01T04:30:00.000Z",
      findings: [],
    },
  ],
  next_cursor: null,
} as const;

export const hqSubmitResultFixture = { dto_version: "hq-write-v1", judgment_id: "jjjjjjj3-0000-0000-0000-000000000003", replayed: false } as const;

/**
 * A case detail with every finding-target source populated, and a generated
 * rewrite present (so `generated_rewrite` is applicable). Sentences present;
 * no prior progress → `progression` must be NA.
 */
export const hqTargetDetailFixture: QualityCaseDetail = {
  evaluation_id: EVAL_A,
  dto_version: "ql-read-v1",
  provenance: { output_sha256: "a".repeat(64), model_name: "gpt-quality-eval" },
  dimensions: [
    { dimension_id: "dddddddd-0000-0000-0000-000000000001", criterion_key: "thesis_clarity", criterion_label: "주장 명료성", level_1_to_5: 4 },
    { dimension_id: "dddddddd-0000-0000-0000-000000000002", criterion_key: "evidence_use", criterion_label: "근거 활용", level_1_to_5: 3 },
  ],
  improvements: [
    { progress_id: "pppppppp-0000-0000-0000-000000000001", issue_key: "logic_gap", title: "논리 연결", is_core: true, priority: 1, previous_progress_id: null },
    { progress_id: "pppppppp-0000-0000-0000-000000000002", issue_key: "structure_weak", title: "구조", is_core: false, priority: 2, previous_progress_id: null },
  ],
  sentence_feedback: [
    { progress_id: "pppppppp-0000-0000-0000-000000000001", observation_key: "s-1", quote: "2문단 첫 문장", linked_issue_key: "logic_gap" },
  ],
  evaluation_evidence_links: [
    { evidence_id: "eeeeeeee-0000-0000-0000-000000000001", dimension_id: "dddddddd-0000-0000-0000-000000000002", progress_id: null },
  ],
  history_context: null,
  generated_rewrite: { status: "completed", origin: "ai_generated", body: "모범 재작성", completed_at: "2026-10-01T04:02:00.000Z" },
};
