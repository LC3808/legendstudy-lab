/**
 * `notification-v1` consumer contract.
 *
 * The canonical inbox lives on the shared backend so LegendStudy APP and LAB
 * read the same rows and the same read state. These parsers are defensive: a
 * response that does not match the contract is a malformed response, not a
 * partially usable one.
 */

export const NOTIFICATION_DTO_VERSION = "notification-v1";

export type NotificationTargetType =
  | "inquiry"
  | "essay_evaluation"
  | "math_evaluation"
  | "payment_order"
  | "credit_history"
  | "essay_lab";

export type NotificationItem = {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly targetType: NotificationTargetType | null;
  readonly targetId: string | null;
  readonly createdAt: string;
  readonly readAt: string | null;
  readonly isRead: boolean;
};

export type NotificationPage = {
  readonly limit: number;
  readonly offset: number;
  readonly unread: number;
  readonly items: readonly NotificationItem[];
};

const TARGET_TYPES: readonly string[] = [
  "inquiry",
  "essay_evaluation",
  "math_evaluation",
  "payment_order",
  "credit_history",
  "essay_lab",
];

export class NotificationError extends Error {
  constructor(
    message: string,
    readonly code: string = "MALFORMED_RESPONSE",
  ) {
    super(message);
    this.name = "NotificationError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const str = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new NotificationError(`missing ${field}`);
  }
  return value;
};

const strOrNull = (value: unknown, field: string): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new NotificationError(`bad ${field}`);
  return value.length === 0 ? null : value;
};

const num = (value: unknown, field: string): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  throw new NotificationError(`bad ${field}`);
};

const numOrNull = (value: unknown, field: string): number | null =>
  value === null || value === undefined ? null : num(value, field);

const bool = (value: unknown, field: string): boolean => {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "t") return true;
  if (value === "false" || value === "f") return false;
  throw new NotificationError(`bad ${field}`);
};

function parseItem(raw: unknown): NotificationItem {
  if (!isRecord(raw)) throw new NotificationError("notification is not an object");
  const targetType = strOrNull(raw.target_type, "target_type");
  if (targetType !== null && !TARGET_TYPES.includes(targetType)) {
    // An unknown target is not a link we are willing to follow.
    throw new NotificationError("unknown target_type");
  }
  return {
    id: str(raw.id, "id"),
    type: str(raw.type, "type"),
    title: str(raw.title, "title"),
    body: str(raw.body, "body"),
    targetType: targetType as NotificationTargetType | null,
    targetId: strOrNull(raw.target_id, "target_id"),
    createdAt: str(raw.created_at, "created_at"),
    readAt: strOrNull(raw.read_at, "read_at"),
    isRead: bool(raw.is_read, "is_read"),
  };
}

export function parseNotificationPage(raw: unknown): NotificationPage {
  if (!isRecord(raw)) throw new NotificationError("page is not an object");
  if (raw.dto_version !== NOTIFICATION_DTO_VERSION) {
    throw new NotificationError("unexpected dto_version");
  }
  const items = raw.items;
  if (!Array.isArray(items)) throw new NotificationError("items is not an array");
  return {
    limit: num(raw.limit, "limit"),
    offset: num(raw.offset, "offset"),
    unread: num(raw.unread, "unread"),
    items: items.map(parseItem),
  };
}

export function parseUnreadCount(raw: unknown): number {
  return numOrNull(raw, "unread_count") ?? 0;
}

export function parseMarkRead(raw: unknown): boolean {
  return bool(raw, "marked");
}