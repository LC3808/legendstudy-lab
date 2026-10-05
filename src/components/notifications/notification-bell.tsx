"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { createNotificationClient } from "@/lib/notifications/client";
import { formatBadge, notificationBadgeLabel } from "@/lib/notifications/format";

/** Dispatched after the inbox changes, so the badge can catch up without a reload. */
export const NOTIFICATIONS_CHANGED_EVENT = "legendstudy:notifications-changed";

export function notifyNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}

/**
 * The header bell.
 *
 * Renders nothing unless the session is authenticated, so the public header is
 * unchanged for visitors. The count is a read of the shared backend, which is
 * why the same number appears in the LegendStudy 앱: neither client caches its
 * own copy of the read state.
 */
export function NotificationBell() {
  const { client, status } = useAuth();
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!client) return;
    try {
      const notifications = createNotificationClient(client);
      setUnread(await notifications.unreadCount());
    } catch {
      // A badge is not worth an error banner; the page reports its own failures.
      setUnread(0);
    }
  }, [client]);

  useEffect(() => {
    // Nothing to load while signed out, and no state to reset: the badge is
    // derived from the session below, so a stale count can never be shown.
    if (status !== "authenticated") return;
    let active = true;
    const run = () => {
      if (active) void load();
    };
    run();
    window.addEventListener("focus", run);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, run);
    document.addEventListener("visibilitychange", run);
    return () => {
      active = false;
      window.removeEventListener("focus", run);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [load, status]);

  if (status !== "authenticated") return null;

  const badge = formatBadge(unread);

  return (
    <Link className="notify-bell" href="/notifications/" aria-label={notificationBadgeLabel(unread)}>
      <span aria-hidden="true" className="notify-bell__icon">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            d="M12 3a5 5 0 0 0-5 5v3.2L5.4 14.6A1 1 0 0 0 6.3 16h11.4a1 1 0 0 0 .9-1.4L17 11.2V8a5 5 0 0 0-5-5Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9.5 19a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
        </svg>
      </span>
      {badge ? (
        <span className="notify-bell__badge" aria-hidden="true">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}