import type { SupabaseClient } from "@supabase/supabase-js";

import {
  NOTIFICATION_DTO_VERSION,
  NotificationError,
  parseMarkRead,
  parseNotificationPage,
  parseUnreadCount,
  type NotificationPage,
} from "./contract";

/**
 * Canonical notification client (`notification-v1` consumer).
 *
 * Uses the existing authenticated browser session and calls only the
 * owner-scoped SECURITY DEFINER functions. It never reads the notification
 * table directly, never holds a privileged key, and never writes anything but
 * the caller's own read state. The backend — not this client — decides who may
 * see what, and APP reads the same rows through the same functions.
 */
export interface NotificationClient {
  refresh(): Promise<void>;
  list(options?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<NotificationPage>;
  unreadCount(): Promise<number>;
  markRead(id: string): Promise<boolean>;
  markAllRead(): Promise<number>;
}

const MAX_LIMIT = 50;

function mapError(error: { code?: string; message?: string } | null): NotificationError {
  if (!error) return new NotificationError("unknown", "UNKNOWN");
  const code = error.code ?? "UNKNOWN";
  if (code === "PT401" || code === "PGRST301" || code === "401") {
    return new NotificationError("로그인이 필요합니다.", "UNAUTHENTICATED");
  }
  if (code === "PT422") return new NotificationError("요청을 처리할 수 없습니다.", "INVALID");
  if (code === "PGRST116" || code === "42P01") {
    return new NotificationError("알림 기능을 사용할 수 없습니다.", "UNAVAILABLE");
  }
  return new NotificationError("알림을 불러오지 못했습니다.", code);
}

export function createNotificationClient(supabase: SupabaseClient): NotificationClient {
  const call = async (fn: string, params: Record<string, unknown>): Promise<unknown> => {
    const { data, error } = await supabase.rpc(fn, params);
    if (error) throw mapError(error);
    return data;
  };

  return {
    /** Keeps the session token fresh before a read, mirroring the other clients. */
    async refresh() {
      await supabase.auth.getSession();
    },

    async list(options = {}) {
      const limit = Math.min(Math.max(options.limit ?? 20, 1), MAX_LIMIT);
      const offset = Math.max(options.offset ?? 0, 0);
      const raw = await call("user_notifications_list", {
        p_limit: limit,
        p_offset: offset,
        p_unread_only: Boolean(options.unreadOnly),
      });
      return parseNotificationPage(raw);
    },

    async unreadCount() {
      const raw = await call("user_notifications_unread_count", {});
      return parseUnreadCount(raw);
    },

    async markRead(id) {
      if (!id) throw new NotificationError("missing notification id", "INVALID");
      const raw = await call("user_notification_mark_read", { p_id: id });
      return parseMarkRead(raw);
    },

    async markAllRead() {
      const raw = await call("user_notifications_mark_all_read", {});
      return parseUnreadCount(raw);
    },
  };
}

export { NOTIFICATION_DTO_VERSION };