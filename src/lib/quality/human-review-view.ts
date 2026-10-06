import type { QualityCaseDetail } from "./contract";
import {
  HQ_BLOCKING_DIMENSIONS,
  HQ_CONDITIONAL_DIMENSIONS,
  HQ_RUBRIC_VERSION,
  HQ_REQUIRED_DIMENSIONS,
  HQ_WRITE_DTO_VERSION,
  type HqDimensionKey,
  type HqDisposition,
  type HqFindingInput,
  type HqIssueCategory,
  type HqJudgment,
  type HqRecommendedAction,
  type HqReviewState,
  type HqRubricResult,
  type HqSelectionReason,
  type HqSeverity,
  type HqSubmitPayload,
  type HqTargetKind,
  type HqTargetRef,
  type HqVerdict,
} from "./human-review-contract";

/**
 * Pure presentation + payload helpers for the Human Review workflow. No DB
 * access; the server remains the sole validation authority — these helpers only
 * drive UX and build the exact canonical payload.
 */

// ── Korean operator labels (canonical values preserved internally) ───────────

export const DISPOSITION_LABELS: Record<HqDisposition, string> = {
  PASS: "적합",
  PASS_WITH_NOTES: "적합 · 참고사항",
  NEEDS_REVIEW: "재검토 필요",
  FAIL: "부적합",
};

export const VERDICT_LABELS: Record<HqVerdict, string> = {
  OK: "양호",
  CONCERN: "우려",
  FAIL: "결함",
  NA: "해당 없음",
};

export const DIMENSION_LABELS: Record<HqDimensionKey, string> = {
  diagnosis: "진단 정확성",
  core_priority: "CORE·우선순위 적절성",
  actionability: "실행 가능성",
  evidence_adherence: "근거 준수",
  stance_preservation: "입장 보존·최소 수정",
  hallucination_absence: "환각·오류 날조 없음",
  sentence_feedback: "문장 피드백 정확성",
  progression: "진행(이전 대비) 정확성",
  generated_rewrite: "생성 재작성 품질",
};

export const ISSUE_CATEGORY_LABELS: Record<HqIssueCategory, string> = {
  FALSE_CORRECTION: "잘못된 교정",
  INVENTED_ERROR: "없는 오류 날조",
  EVIDENCE_MISREAD: "근거 오독",
  UNSUPPORTED_CLAIM: "근거 없는 주장",
  STANCE_CHANGE: "입장 변경",
  CORE_PRIORITY_ERROR: "CORE·우선순위 오류",
  SENTENCE_SPAN_ERROR: "문장 범위 오류",
  PROGRESSION_ERROR: "진행 판단 오류",
  OVER_REWRITE: "과도한 재작성",
  UNDER_SPECIFIED_GUIDANCE: "불충분한 지침",
  MISSING_IMPORTANT_ISSUE: "중요 이슈 누락",
  OTHER: "기타",
};

export const SEVERITY_LABELS: Record<HqSeverity, string> = {
  MINOR: "경미",
  MATERIAL: "중대",
  CRITICAL: "치명",
};

export const REVIEW_STATE_LABELS: Record<HqReviewState, string> = {
  UNREVIEWED: "미검토",
  REVIEWED_ACCEPTABLE: "검토됨 · 적합",
  REVIEWED_WITH_CONCERNS: "검토됨 · 주의",
  REVIEWED_FAILED: "검토됨 · 부적합",
  MULTIPLE_REVIEWS: "복수 검토",
  DISAGREEMENT: "검토 불일치",
};

export function reviewStateLabel(state: string | null | undefined): string {
  if (!state) return "미검토";
  return REVIEW_STATE_LABELS[state as HqReviewState] ?? state;
}

export const SELECTION_REASON_LABELS: Record<HqSelectionReason, string> = {
  EARLY_CENSUS: "초기 전수 검토",
  RANDOM_SAMPLE: "무작위 표본",
  ANOMALY: "이상 징후",
  USER_REPORT: "사용자 신고",
  OPERATOR_REQUEST: "운영자 요청",
  MODEL_CHANGE_AUDIT: "모델 변경 감사",
  DISPUTE: "이의 제기",
  OTHER: "기타",
};

export const RECOMMENDED_ACTION_LABELS: Record<HqRecommendedAction, string> = {
  NONE: "없음",
  MONITOR: "모니터링",
  REVIEW_PROMPT: "프롬프트 검토",
  REVIEW_EVIDENCE: "근거 검토",
  RE_EVALUATE: "재평가 검토",
  INVALIDATE_CANDIDATE: "무효화 후보",
  ESCALATE: "에스컬레이션",
};

// ── Reviewer display identity (never email/name) ─────────────────────────────

export function reviewerLabel(judgment: Pick<HqJudgment, "reviewer_state" | "reviewer_user_id">): string {
  if (judgment.reviewer_state === "DELETED_OR_UNAVAILABLE" || !judgment.reviewer_user_id) {
    return "삭제된 리뷰어";
  }
  const compact = judgment.reviewer_user_id.replace(/-/g, "");
  return `운영자 ${compact.slice(0, 6)}`;
}

// ── Subject binding for the write payload ────────────────────────────────────

export function expectedOutputSha256(detail: QualityCaseDetail | null | undefined): string | null {
  const value = detail?.provenance?.output_sha256;
  return typeof value === "string" ? value : null;
}

// ── Conditional-dimension applicability derived from the loaded detail ───────

export interface ConditionalApplicability {
  sentence_feedback: boolean;
  progression: boolean;
  generated_rewrite: boolean;
}

function nonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Best-effort mirror of the server's conditional predicates, used only to
 * pre-select/lock NA vs. a real verdict. The server is authoritative and rejects
 * mismatches, which the UI surfaces.
 */
export function conditionalApplicability(detail: QualityCaseDetail | null | undefined): ConditionalApplicability {
  const sentence = nonEmptyArray(detail?.sentence_feedback);
  const historyContext = detail?.history_context as Record<string, unknown> | null | undefined;
  const hasPriorContext = Boolean(
    historyContext && typeof historyContext === "object" && historyContext.selected_previous_evaluation_id,
  );
  const hasPrevProgress = Array.isArray(detail?.improvements)
    ? detail!.improvements!.some((item) => Boolean(item.previous_progress_id))
    : false;
  const rewrite = detail?.generated_rewrite ?? null;
  const rewritePresent = Boolean(rewrite && (rewrite.body || rewrite.status));
  return {
    sentence_feedback: sentence,
    progression: hasPriorContext || hasPrevProgress,
    generated_rewrite: rewritePresent,
  };
}

export function isConditionalDimension(key: HqDimensionKey): boolean {
  return (HQ_CONDITIONAL_DIMENSIONS as readonly string[]).includes(key);
}

export function isBlockingDimension(key: HqDimensionKey): boolean {
  return (HQ_BLOCKING_DIMENSIONS as readonly string[]).includes(key);
}

// ── Finding target options extracted from the loaded detail ──────────────────

export interface FindingTargetOption {
  key: string;
  kind: HqTargetKind;
  label: string;
  ref: HqTargetRef;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Build the allowed finding targets strictly from the loaded `ql_case_detail`.
 * Operators pick from these; arbitrary/typed ids and cross-evaluation targets are
 * therefore impossible in the normal UI.
 */
export function extractFindingTargets(detail: QualityCaseDetail | null | undefined): FindingTargetOption[] {
  const options: FindingTargetOption[] = [{ key: "OVERALL", kind: "OVERALL", label: "전체 평가", ref: null }];
  if (!detail) return options;

  for (const dim of detail.dimensions ?? []) {
    const id = str(dim.dimension_id);
    if (id) options.push({ key: `DIM:${id}`, kind: "DIMENSION", label: `차원 · ${dim.criterion_label ?? dim.criterion_key ?? id}`, ref: { dimension_id: id } });
  }
  for (const imp of detail.improvements ?? []) {
    const pid = str(imp.progress_id);
    if (pid) options.push({ key: `PROG:${pid}`, kind: "PROGRESS", label: `개선 · ${imp.title ?? imp.issue_key ?? pid}`, ref: { progress_id: pid } });
    const issueKey = str(imp.issue_key);
    if (issueKey) options.push({ key: `ISSUE:${issueKey}`, kind: "ISSUE_KEY", label: `이슈키 · ${issueKey}`, ref: { issue_key: issueKey } });
  }
  const sentences = Array.isArray(detail.sentence_feedback) ? (detail.sentence_feedback as Array<Record<string, unknown>>) : [];
  for (const s of sentences) {
    const pid = str(s.progress_id);
    const obs = str(s.observation_key);
    if (pid && obs) {
      const quote = str(s.quote) ?? str(s.sentence) ?? obs;
      options.push({ key: `SENT:${pid}:${obs}`, kind: "SENTENCE", label: `문장 · ${quote.slice(0, 24)}`, ref: { progress_id: pid, observation_key: obs } });
    }
  }
  const links = Array.isArray(detail.evaluation_evidence_links) ? (detail.evaluation_evidence_links as Array<Record<string, unknown>>) : [];
  for (const link of links) {
    const eid = str(link.evidence_id);
    if (eid) {
      options.push({
        key: `EVID:${eid}:${str(link.dimension_id) ?? ""}:${str(link.progress_id) ?? ""}`,
        kind: "EVIDENCE_LINK",
        label: `근거연결 · ${eid.slice(0, 8)}`,
        ref: { evidence_id: eid, dimension_id: str(link.dimension_id), progress_id: str(link.progress_id) },
      });
    }
  }
  const rewrite = detail.generated_rewrite ?? null;
  if (rewrite && (rewrite.body || rewrite.status)) {
    options.push({ key: "GENREWRITE", kind: "GENERATED_REWRITE", label: "AI 생성 재작성", ref: null });
  }
  return options;
}

// ── Draft + payload build + lightweight consistency validation ───────────────

export interface DraftFinding {
  issue_category: HqIssueCategory | null;
  severity: HqSeverity | null;
  targetOptionKey: string | null;
  note: string;
}

export interface HumanReviewDraft {
  overall_disposition: HqDisposition | null;
  rubric: Partial<Record<HqDimensionKey, HqVerdict>>;
  findings: DraftFinding[];
  summary_note: string;
  selection_reason: HqSelectionReason;
  recommended_action: HqRecommendedAction;
  official_source_reviewed: boolean;
  supersedes_judgment_id?: string | null;
}

export const SUMMARY_NOTE_MAX = 2000;
export const FINDING_NOTE_MAX = 1000;

export function emptyDraft(applicability: ConditionalApplicability): HumanReviewDraft {
  const rubric: Partial<Record<HqDimensionKey, HqVerdict>> = {};
  // Lock non-applicable conditional dimensions to NA up front.
  if (!applicability.sentence_feedback) rubric.sentence_feedback = "NA";
  if (!applicability.progression) rubric.progression = "NA";
  if (!applicability.generated_rewrite) rubric.generated_rewrite = "NA";
  return {
    overall_disposition: null,
    rubric,
    findings: [],
    summary_note: "",
    selection_reason: "EARLY_CENSUS",
    recommended_action: "NONE",
    official_source_reviewed: false,
  };
}

/** Lightweight pre-submit validation (KO messages). Server remains authoritative. */
export function validateDraft(
  draft: HumanReviewDraft,
  applicability: ConditionalApplicability,
  targets: FindingTargetOption[],
): string[] {
  const errors: string[] = [];
  if (!draft.overall_disposition) errors.push("종합 판정을 선택하세요.");
  if (!draft.official_source_reviewed) errors.push("공식 자료·맥락 확인을 체크해야 제출할 수 있습니다.");

  for (const dim of HQ_REQUIRED_DIMENSIONS) {
    if (!draft.rubric[dim]) errors.push(`필수 항목 미선택: ${DIMENSION_LABELS[dim]}`);
  }
  for (const dim of HQ_CONDITIONAL_DIMENSIONS) {
    const applicable = applicability[dim];
    const verdict = draft.rubric[dim];
    if (applicable && (!verdict || verdict === "NA")) errors.push(`조건부 항목 판정 필요: ${DIMENSION_LABELS[dim]}`);
    if (!applicable && verdict !== "NA") errors.push(`조건부 항목은 해당 없음(NA)이어야 합니다: ${DIMENSION_LABELS[dim]}`);
  }

  if (draft.summary_note.length > SUMMARY_NOTE_MAX) errors.push("내부 메모가 최대 길이를 초과했습니다.");

  const verdicts = Object.values(draft.rubric);
  const hasFail = verdicts.includes("FAIL");
  const hasConcern = verdicts.includes("CONCERN");
  const findingSeverities = draft.findings.map((f) => f.severity);
  const hasNonMinorFinding = findingSeverities.some((s) => s && s !== "MINOR");

  if (draft.overall_disposition === "PASS") {
    if (hasFail || hasConcern) errors.push("적합(PASS)은 모든 항목이 양호/해당 없음이어야 합니다.");
    if (draft.findings.length > 0) errors.push("적합(PASS)에는 이슈를 추가할 수 없습니다.");
  }
  if (draft.overall_disposition === "PASS_WITH_NOTES") {
    if (hasFail) errors.push("적합·참고사항은 결함(FAIL) 항목이 없어야 합니다.");
    if (hasNonMinorFinding) errors.push("적합·참고사항의 이슈는 경미(MINOR)만 허용됩니다.");
  }

  draft.findings.forEach((finding, index) => {
    const n = index + 1;
    if (!finding.issue_category) errors.push(`이슈 ${n}: 분류를 선택하세요.`);
    if (!finding.severity) errors.push(`이슈 ${n}: 심각도를 선택하세요.`);
    if (!finding.targetOptionKey || !targets.some((t) => t.key === finding.targetOptionKey)) {
      errors.push(`이슈 ${n}: 대상을 현재 평가에서 선택하세요.`);
    }
    if (finding.note.length > FINDING_NOTE_MAX) errors.push(`이슈 ${n}: 메모가 최대 길이를 초과했습니다.`);
  });

  return errors;
}

function buildRubricResult(draft: HumanReviewDraft): HqRubricResult {
  const result = {} as HqRubricResult;
  for (const dim of [...HQ_REQUIRED_DIMENSIONS, ...HQ_CONDITIONAL_DIMENSIONS]) {
    result[dim] = (draft.rubric[dim] ?? "NA") as HqVerdict;
  }
  return result;
}

function buildFindings(draft: HumanReviewDraft, targets: FindingTargetOption[]): HqFindingInput[] {
  return draft.findings.map((finding) => {
    const option = targets.find((t) => t.key === finding.targetOptionKey);
    return {
      issue_category: finding.issue_category as HqIssueCategory,
      severity: finding.severity as HqSeverity,
      target_kind: (option?.kind ?? "OVERALL") as HqTargetKind,
      target_ref: option?.ref ?? null,
      note: finding.note.length > 0 ? finding.note : null,
    };
  });
}

/**
 * Build the exact canonical write payload. The same draft + clientSubmissionId
 * must reproduce the identical payload for an idempotent retry (findings order is
 * preserved from the draft).
 */
export function buildSubmitPayload(args: {
  draft: HumanReviewDraft;
  evaluationId: string;
  expectedOutputSha256: string;
  clientSubmissionId: string;
  targets: FindingTargetOption[];
}): HqSubmitPayload {
  const { draft, evaluationId, expectedOutputSha256: sha, clientSubmissionId, targets } = args;
  const payload: HqSubmitPayload = {
    dto_version: HQ_WRITE_DTO_VERSION,
    evaluation_id: evaluationId,
    expected_output_sha256: sha,
    client_submission_id: clientSubmissionId,
    rubric_version: HQ_RUBRIC_VERSION,
    overall_disposition: draft.overall_disposition as HqDisposition,
    rubric_result: buildRubricResult(draft),
    findings: buildFindings(draft, targets),
    official_source_reviewed: true,
    summary_note: draft.summary_note.length > 0 ? draft.summary_note : null,
    selection_reason: draft.selection_reason,
    recommended_action: draft.recommended_action,
  };
  if (draft.supersedes_judgment_id) payload.supersedes_judgment_id = draft.supersedes_judgment_id;
  return payload;
}
