import type { NotificationItem, NotificationTargetType } from "./contract";

/**
 * Where a notification leads.
 *
 * The backend stores a typed reference, never a URL, so this table is the only
 * place that turns a notification into a destination. A target the LAB does not
 * publish (the Math result surface is a LegendStudy 앱 route) falls back to the
 * hub for that product rather than to a dead link.
 */
const TARGET_ROUTES: Record<NotificationTargetType, (id: string | null) => string> = {
  inquiry: () => "/support/inquiry/",
  essay_evaluation: (id) => (id ? `/essay-lab/evaluation/${id}` : "/my/essays"),
  math_evaluation: () => "/essay-lab",
  payment_order: () => "/account/",
  credit_history: () => "/account/",
  essay_lab: () => "/essay-lab",
};

export function notificationHref(item: Pick<NotificationItem, "targetType" | "targetId">): string {
  if (!item.targetType) return "/notifications/";
  return TARGET_ROUTES[item.targetType](item.targetId);
}

/** Type label shown next to the title. */
export function notificationTypeLabel(type: string): string {
  switch (type) {
    case "inquiry_reply":
      return "1:1 문의";
    case "essay_evaluation_complete":
      return "논술 첨삭";
    case "math_evaluation_complete":
      return "수리논술 첨삭";
    case "payment_complete":
      return "결제";
    case "credit_grant":
      return "Credit 지급";
    case "credit_balance_reminder":
      return "Credit 잔액";
    case "credit_expiry":
      return "Credit 만료";
    case "payment_refund":
      return "환불";
    default:
      return "안내";
  }
}

/**
 * Relative time for the list. Deliberately coarse: the inbox is read at a
 * glance, and an exact timestamp is available on the row itself.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return "방금 전";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const date = new Date(then);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day}`;
}

/** Badge text. Large counts stop being a number and become a signal. */
export function formatBadge(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : `${count}`;
}

/** Screen-reader text for the bell. */
export function notificationBadgeLabel(count: number): string {
  if (count <= 0) return "알림, 읽지 않은 알림 없음";
  return `알림, 읽지 않은 알림 ${count}개`;
}