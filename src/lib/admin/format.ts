import type { AdminCount } from "./contract";

/**
 * Display helpers for the operations console.
 *
 * Two rules matter here:
 *  1. A null count means "the owning subsystem is not installed". It renders as
 *     미설치, never as 0, so an operator cannot read an uninstalled subsystem as
 *     an empty one.
 *  2. The account lifecycle token is shown exactly as the database reports it,
 *     with the canonical English token kept visible beside the Korean label.
 */
export function formatCount(value: AdminCount): string {
  if (value === null || value === undefined) return "미설치";
  return value.toLocaleString("ko-KR");
}

export function formatCredit(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString("ko-KR")} Credit`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("ko-KR");
}

/** `profiles.grade_level` is a smallint; the console owns the Korean label. */
export function gradeLabel(value: string | null): string {
  if (!value) return "미입력";
  const map: Record<string, string> = { "1": "고1", "2": "고2", "3": "고3" };
  return map[value] ?? `기타(${value})`;
}

export function schoolCodeLabel(value: string | null): string {
  // School names are not stored. The console shows the NEIS code only and says so.
  return value ?? "미입력";
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(
    parsed.getHours(),
  )}:${pad(parsed.getMinutes())}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export type StateTone = "normal" | "pending" | "danger";

/** Canonical account lifecycle, shown with the database token intact. */
export function accountStateLabel(state: string): { label: string; tone: StateTone } {
  switch (state) {
    case "NORMAL":
      return { label: "정상", tone: "normal" };
    case "DELETION_PENDING":
      return { label: "삭제 요청됨", tone: "pending" };
    case "ERASING":
      return { label: "삭제 처리 중", tone: "pending" };
    case "ERASED":
      return { label: "삭제 완료", tone: "danger" };
    case "CANCELLED":
      return { label: "삭제 요청 취소", tone: "normal" };
    case "RESTRICTED":
      return { label: "이용 제한", tone: "danger" };
    default:
      return { label: state, tone: "danger" };
  }
}

export {formatCreditGrantType as creditOriginLabel, formatCreditGrantType as transactionTypeLabel} from '../credit-display';

/** Signed delta with an explicit sign, so a direction is never ambiguous. */
export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("ko-KR")}`;
}

// --- ADMIN-P0-B: payment and inquiry labels ---------------------------------

/** Payment order state, shown with the database token intact. */
export function orderStateLabel(state: string): { label: string; tone: StateTone } {
  switch (state) {
    case "ORDER_CREATED":
      return { label: "주문 생성", tone: "pending" };
    case "AUTHORIZATION_PENDING":
      return { label: "승인 대기", tone: "pending" };
    case "PAID":
      return { label: "결제 완료", tone: "normal" };
    case "CANCEL_PENDING":
      return { label: "취소 처리 중", tone: "pending" };
    case "PARTIALLY_CANCELLED":
      return { label: "부분 취소", tone: "pending" };
    case "CANCELLED":
      return { label: "취소 완료", tone: "danger" };
    case "FAILED":
      return { label: "결제 실패", tone: "danger" };
    case "EXPIRED":
      return { label: "만료", tone: "danger" };
    default:
      return { label: state, tone: "danger" };
  }
}

/** Credit posting state for a paid order. */
export function grantStateLabel(state: string): { label: string; tone: StateTone } {
  switch (state) {
    case "NONE":
      return { label: "미지급", tone: "pending" };
    case "TEST_RECORDED":
      return { label: "TEST 기록", tone: "pending" };
    case "POSTED":
      return { label: "지급 완료", tone: "normal" };
    case "REVOKED":
      return { label: "회수", tone: "danger" };
    default:
      return { label: state, tone: "danger" };
  }
}

export function paymentModeLabel(mode: string): string {
  if (mode === "LIVE") return "실결제 (LIVE)";
  if (mode === "TEST") return "테스트 결제 (TEST)";
  return mode;
}

export function inquiryCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    account: "계정·로그인",
    material: "학습자료",
    essay_humanities: "인문논술 첨삭",
    essay_math: "수리논술 첨삭",
    credit: "Credit",
    payment: "결제·환불",
    deletion: "회원 탈퇴·계정 삭제",
    technical: "오류·기술 문제",
    other: "기타",
  };
  return map[category] ?? category;
}

export function inquiryStatusLabel(status: string): { label: string; tone: StateTone } {
  switch (status) {
    case "RECEIVED":
      return { label: "접수", tone: "pending" };
    case "IN_PROGRESS":
      return { label: "처리 중", tone: "pending" };
    case "ANSWERED":
      return { label: "답변 완료", tone: "normal" };
    case "CLOSED":
      return { label: "종결", tone: "normal" };
    default:
      return { label: status, tone: "danger" };
  }
}

export function deliveryStateLabel(delivery: string): { label: string; tone: StateTone } {
  switch (delivery) {
    case "pending":
      return { label: "발송 대기", tone: "pending" };
    case "sent":
      return { label: "발송 완료", tone: "normal" };
    case "failed":
      return { label: "발송 실패", tone: "danger" };
    default:
      return { label: delivery, tone: "pending" };
  }
}

/** A duration in seconds, rendered so a blank value never reads as "0초". */
export function formatDuration(value: AdminCount): string {
  if (value === null || value === undefined) return "측정값 없음";
  if (value < 60) return `${value.toLocaleString("ko-KR")}초`;
  const hours = value / 3600;
  if (hours < 48) return `${hours.toFixed(1)}시간`;
  return `${(hours / 24).toFixed(1)}일`;
}
