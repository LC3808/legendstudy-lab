// --- ADMIN-P0-C: operations display -----------------------------------------
import { formatCredit, type StateTone } from "./format";
import type { AdminCount } from "./contract";

/**
 * Labels for the essay / math operations read.
 *
 * Every one of these has an explicit "not measured" branch. The console must
 * never turn a missing value into a zero, because a zero and an absence mean
 * opposite things to the person reading the pipeline.
 */
export function formatProcessing(ms: AdminCount): string {
  if (ms === null || ms === undefined) return "측정값 없음";
  if (ms < 1000) return `${ms.toLocaleString("ko-KR")}ms`;
  const seconds = ms / 1000;
  if (seconds < 90) return `${seconds.toFixed(1)}초`;
  const minutes = seconds / 60;
  if (minutes < 90) return `${minutes.toFixed(1)}분`;
  return `${(minutes / 60).toFixed(1)}시간`;
}

/** "성공 / 실패 / 처리 중 / 무효화" — the operator's first question. */
export function opsOutcomeLabel(outcome: string): { label: string; tone: StateTone } {
  switch (outcome) {
    case "success":
      return { label: "성공", tone: "normal" };
    case "failure":
      return { label: "실패", tone: "danger" };
    case "invalidated":
      return { label: "무효화", tone: "pending" };
    default:
      return { label: "처리 중", tone: "pending" };
  }
}

/** The raw pipeline state, kept separate from the outcome summary. */
export function opsStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "requested":
      return "요청됨";
    case "processing":
      return "처리 중";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
    case "cancelled":
      return "취소";
    case "invalidated":
      return "무효화";
    default:
      return status;
  }
}

/**
 * Human review state. NOT_TRACKED is distinct from NOT_REVIEWED: the first means
 * the quality projection is not deployed here, the second means it is deployed
 * and this case has not been judged.
 */
export function humanReviewStateLabel(state: string): { label: string; tone: StateTone } {
  switch (state) {
    case "REVIEWED":
      return { label: "검토 완료", tone: "normal" };
    case "NOT_REVIEWED":
      return { label: "미검토", tone: "pending" };
    default:
      return { label: "추적 안 됨", tone: "pending" };
  }
}

/** The human quality disposition, which is a verdict and reads as one. */
export function humanDispositionLabel(disposition: string | null): string {
  switch (disposition) {
    case "PASS":
      return "통과";
    case "PASS_WITH_NOTES":
      return "조건부 통과";
    case "NEEDS_REVIEW":
      return "추가 검토 필요";
    case "FAIL":
      return "부적합";
    default:
      return disposition ?? "-";
  }
}

/** Why a product line cannot be read right now. */
export function opsUnavailableLabel(reason: string | null): string {
  switch (reason) {
    case "NOT_INSTALLED":
      return "런타임 미설치";
    case "SCHEMA_INCOMPLETE":
      return "런타임 미배포 (부분 스키마)";
    default:
      return "사용 불가";
  }
}

/** What the operator is looking at: the product line, plus the Math resolve kind. */
export function opsProductLabel(type: string, attemptKind: string | null): string {
  const base = type === "math" ? "수리논술" : "인문논술";
  if (!attemptKind) return base;
  switch (attemptKind) {
    case "INITIAL":
      return `${base} · 최초`;
    case "FULL_RESOLVE":
      return `${base} · 전체 재풀이`;
    case "STEP_RETRY":
      return `${base} · 단계 재시도`;
    case "SHORT_ANSWER_RESOLVE":
      return `${base} · 단답 재풀이`;
    default:
      return `${base} · ${attemptKind}`;
  }
}

/** The request that produced the evaluation. */
export function opsRequestKindLabel(requestKind: string | null): string {
  switch (requestKind) {
    case "operator_reevaluation":
    case "MATH_REEVALUATION":
      return "재평가";
    case "student":
    case "MATH_INITIAL_EVALUATION":
      return "최초 평가";
    default:
      return requestKind ?? "-";
  }
}

/** The model identity, so a prompt or model change is visible on the row. */
export function opsModelLabel(item: {
  modelProvider: string | null;
  modelName: string | null;
  promptVersion: string | null;
  modelVersion: string | null;
}): string {
  const model = [item.modelProvider, item.modelName].filter(Boolean).join(" ");
  const parts = [model || null, item.modelVersion, item.promptVersion].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "-";
}

/** The billing decision behind the Credits shown on the row. */
export function opsBillingLabel(item: {
  creditsCharged: number | null;
  billingStatus: string | null;
  billingReason: string | null;
}): string {
  if (item.creditsCharged === null) return "차감 없음";
  const state =
    item.billingStatus === "settled"
      ? "차감 완료"
      : item.billingStatus === "reserved"
        ? "예약됨"
        : item.billingStatus === "released"
          ? "반환됨"
          : item.billingStatus === "rejected"
            ? "거부됨"
            : (item.billingStatus ?? "상태 미확인");
  return `${formatCredit(item.creditsCharged)} · ${state}`;
}
