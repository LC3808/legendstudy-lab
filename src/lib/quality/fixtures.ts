import { QUALITY_DTO_VERSION, type QualityCaseDetail } from "./contract";

/**
 * EXPLICIT TEST / DEV FIXTURES for the `ql-read-v1` consumer.
 *
 * These are NOT Production data and must NEVER be rendered as Production, auto-
 * inserted, or used as a fallback after an RPC failure (task §10, §16, §31).
 * Production pages do not import this module; only tests and clearly-labeled dev
 * harnesses may. The shapes here are illustrative fixtures, not canonical facts.
 */

export const qualityListEnvelopeEmptyFixture = {
  dto_version: QUALITY_DTO_VERSION,
  cases: [],
  next_cursor: null,
} as const;

/** Two cases sharing an identical `requested_at` to exercise the paired cursor. */
export const qualityListEnvelopePopulatedFixture = {
  dto_version: QUALITY_DTO_VERSION,
  cases: [
    {
      evaluation_id: "11111111-1111-1111-1111-111111111111",
      attempt_id: "aaaaaaa1-0000-0000-0000-000000000001",
      question_id: "qqqqqqq1-0000-0000-0000-000000000001",
      university_name: "경북대학교",
      exam_name: "AAT",
      admission_year: 2027,
      question_label: "인문 I-1",
      requested_at: "2026-10-01T04:00:00.000Z",
      completed_at: "2026-10-01T04:01:10.000Z",
      submitted_at: "2026-10-01T03:59:00.000Z",
      status: "completed",
      request_kind: "initial",
      invalidated_at: null,
      model_provider: "GPT",
      model_name: "gpt-quality-eval",
      prompt_version: "p-2026.10",
      contract_version: "c-2026.10",
      evaluation_version: "e-2026.10",
      regime_key: "aat_humanities",
      evidence_manifest_sha256: "0".repeat(64),
      core_count: 2,
      has_generated_rewrite: true,
      has_subsequent_student_attempt: false,
      processing_outcome: "ok",
      student_pseudonym: "a1b2c3d4e5f6",
    },
    {
      evaluation_id: "22222222-2222-2222-2222-222222222222",
      attempt_id: "aaaaaaa2-0000-0000-0000-000000000002",
      question_id: "qqqqqqq1-0000-0000-0000-000000000001",
      university_name: "경북대학교",
      exam_name: "AAT",
      admission_year: 2027,
      question_label: "인문 I-1",
      requested_at: "2026-10-01T04:00:00.000Z",
      completed_at: null,
      submitted_at: "2026-10-01T03:58:00.000Z",
      status: "processing",
      request_kind: "initial",
      invalidated_at: null,
      model_provider: null,
      model_name: null,
      prompt_version: null,
      contract_version: null,
      evaluation_version: null,
      regime_key: null,
      evidence_manifest_sha256: null,
      core_count: 0,
      has_generated_rewrite: false,
      has_subsequent_student_attempt: false,
      processing_outcome: null,
      student_pseudonym: "f6e5d4c3b2a1",
    },
  ],
  // Paired cursor: identical timestamp means the id half is what disambiguates.
  next_cursor: {
    requested_at: "2026-10-01T04:00:00.000Z",
    evaluation_id: "22222222-2222-2222-2222-222222222222",
  },
} as const;

/**
 * A rich detail fixture exercising: full answer text, CORE (core_focus) vs
 * NON-CORE split incl. a zero-CORE-compatible structure, `[]` vs `null`
 * distinctions (dimensions populated, official_evidence `[]`, sentence_feedback
 * `null`), a generated rewrite distinct from a student rewrite attempt,
 * provenance and processing.
 */
export const qualityCaseDetailFixture: QualityCaseDetail = {
  evaluation_id: "11111111-1111-1111-1111-111111111111",
  dto_version: QUALITY_DTO_VERSION,
  question_context: {
    question_id: "qqqqqqq1-0000-0000-0000-000000000001",
    question_label: "인문 I-1",
    university: "경북대학교",
    exam_name: "AAT",
    admission_year: 2027,
    campus: "대구",
    admission_track: "인문",
    verification_status: "OFFICIAL_PARTIAL",
  },
  student_submission: {
    attempt_id: "aaaaaaa1-0000-0000-0000-000000000001",
    attempt_no: 1,
    submitted_at: "2026-10-01T03:59:00.000Z",
    character_count: 812,
    input_method: "keyboard",
    answer_full_text: "학생이 제출한 전체 답안 본문입니다. 품질 검증 목적의 fixture 텍스트입니다.",
  },
  student_pseudonym: "a1b2c3d4e5f6",
  evaluation: {
    status: "completed",
    request_kind: "initial",
    supersedes_evaluation_id: null,
    correction_reason: null,
    invalidated_at: null,
    invalidation_reason: null,
    overall_summary: "전체 평가 요약 예시입니다.",
    strengths: ["논지가 분명함", "근거 인용이 구체적"],
    rewrite_checklist: ["서론에서 핵심 주장 1문장으로 명시", "2문단 근거-주장 연결 보강"],
    uncertainty_note: null,
    requested_at: "2026-10-01T04:00:00.000Z",
    completed_at: "2026-10-01T04:01:10.000Z",
  },
  dimensions: [
    {
      criterion_key: "thesis_clarity",
      criterion_label: "주장 명료성",
      origin: "OFFICIAL_SOURCE",
      official_weight_percent: 30,
      level_1_to_5: 4,
      explanation: "주장이 비교적 분명하게 드러남.",
      uncertainty_note: null,
    },
    {
      criterion_key: "evidence_use",
      criterion_label: "근거 활용",
      origin: "OFFICIAL_SOURCE",
      official_weight_percent: 40,
      level_1_to_5: 3,
      explanation: "근거는 있으나 연결이 느슨함.",
      uncertainty_note: "제시문 범위 확인 필요",
    },
  ],
  improvements: [
    {
      progress_id: "p-1",
      previous_progress_id: null,
      issue_key: "logic_gap",
      category: "logic",
      status: "active",
      title: "주장-근거 논리 연결",
      explanation: "2문단에서 근거가 주장을 직접 뒷받침하지 못함.",
      next_action: "근거 뒤에 '따라서 ~' 연결 문장 추가",
      priority: 1,
      core_focus: true,
    },
    {
      progress_id: "p-2",
      previous_progress_id: null,
      issue_key: "structure_weak",
      category: "structure",
      status: "active",
      title: "서론 핵심 주장 명시",
      explanation: "서론에 핵심 주장이 모호함.",
      next_action: "서론 마지막에 주장 1문장 추가",
      priority: 2,
      core_focus: true,
    },
    {
      progress_id: "p-3",
      previous_progress_id: null,
      issue_key: "length_imbalance",
      category: "format",
      status: "active",
      title: "문단 길이 균형",
      explanation: "결론이 지나치게 짧음.",
      next_action: "결론 1-2문장 보강",
      priority: 3,
      core_focus: false,
    },
  ],
  // Distinguish `null` (unavailable) from `[]` (empty) across groups:
  scaffolding_availability: null,
  core_improvement_keys: ["logic_gap", "structure_weak"],
  sentence_feedback: null,
  history_context: null,
  previous_review_representation: null,
  official_evidence: [],
  evaluation_evidence_links: [],
  frozen_evidence_bindings: null,
  frozen_criterion_bindings: null,
  reference_metadata_scope: null,
  student_attempts: [
    {
      attempt_id: "aaaaaaa1-0000-0000-0000-000000000001",
      attempt_no: 1,
      submitted_at: "2026-10-01T03:59:00.000Z",
      character_count: 812,
      is_rewrite: false,
    },
  ],
  attempt_window: null,
  generated_rewrite: {
    status: "completed",
    origin: "ai_generated",
    body: "AI가 생성한 모범 재작성 예시 본문입니다.",
    completed_at: "2026-10-01T04:02:00.000Z",
  },
  provenance: {
    model_provider: "GPT",
    model_name: "gpt-quality-eval",
    model_version: "2026-10",
    prompt_version: "p-2026.10",
    contract_version: "c-2026.10",
    evaluation_version: "e-2026.10",
    regime_key: "aat_humanities",
    evidence_completeness: "partial",
    evidence_manifest_sha256: "0".repeat(64),
    input_sha256: "1".repeat(64),
    output_sha256: "2".repeat(64),
  },
  processing: {
    run_no: 1,
    provider: "GPT",
    model_name: "gpt-quality-eval",
    status: "succeeded",
    latency_ms: 70000,
    input_tokens: 2200,
    output_tokens: 900,
    cost_amount: 0,
    currency: "USD",
    error_code: null,
    timed_out_at: null,
  },
  session_evaluations: [
    {
      evaluation_id: "11111111-1111-1111-1111-111111111111",
      attempt_id: "aaaaaaa1-0000-0000-0000-000000000001",
      status: "completed",
      requested_at: "2026-10-01T04:00:00.000Z",
    },
  ],
  session_evaluations_truncated: false,
};
