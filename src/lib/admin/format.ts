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

export function creditOriginLabel(origin: string): string {
  const map: Record<string, string> = {
    signup_bonus: "신규 가입 무료",
    purchase: "구매",
    promotion: "이벤트·프로모션",
    admin_grant: "운영 지급",
    compensation: "보상",
    b2b_program: "학교 단체",
  };
  return map[origin] ?? origin;
}

export function transactionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    purchase: "구매",
    signup_bonus: "신규 가입 무료",
    promotion: "프로모션",
    admin_grant: "운영 지급",
    compensation: "보상",
    b2b_program: "학교 단체",
    reserve: "예약",
    consume: "사용",
    release: "예약 해제",
    refund: "환불",
    expiration: "만료",
    adjustment: "정정",
  };
  return map[type] ?? type;
}

/** Signed delta with an explicit sign, so a direction is never ambiguous. */
export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("ko-KR")}`;
}
