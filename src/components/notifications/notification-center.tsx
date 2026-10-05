"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { notifyNotificationsChanged } from "@/components/notifications/notification-bell";
import { createNotificationClient } from "@/lib/notifications/client";
import type { NotificationItem } from "@/lib/notifications/contract";
import {
  formatRelativeTime,
  notificationHref,
  notificationTypeLabel,
} from "@/lib/notifications/format";

const PAGE_SIZE = 20;

/**
 * The inbox.
 *
 * Reads and acknowledges through the shared backend, so opening a notification
 * here is the same act as opening it in the LegendStudy 앱. A notification is
 * marked read when the member follows it, not when the list renders: an unread
 * badge that cleared itself on view would not survive the trip between clients.
 *
 * The session gate is derived from the auth context rather than stored, so the
 * component never has to synchronise two copies of the same fact.
 */
export function NotificationCenter() {
  const { client, status } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const gate: "loading" | "unconfigured" | "unauthenticated" | null =
    status === "loading"
      ? "loading"
      : status === "unconfigured"
        ? "unconfigured"
        : status === "authenticated" && client
          ? null
          : "unauthenticated";

  const load = useCallback(
    async (offset: number, options: { unreadOnly: boolean; append: boolean }) => {
      if (!client) return;
      setBusy(true);
      try {
        const notifications = createNotificationClient(client);
        await notifications.refresh();
        const page = await notifications.list({
          limit: PAGE_SIZE,
          offset,
          unreadOnly: options.unreadOnly,
        });
        setItems((previous) => (options.append ? [...previous, ...page.items] : [...page.items]));
        setUnread(page.unread);
        setHasMore(page.items.length === PAGE_SIZE);
        setFailed(false);
        setLoaded(true);
      } catch {
        setFailed(true);
        setLoaded(true);
      } finally {
        setBusy(false);
      }
    },
    [client],
  );

  useEffect(() => {
    if (gate) return;
    let active = true;
    // Deferred so the effect body itself writes no state.
    void (async () => {
      await Promise.resolve();
      if (active) await load(0, { unreadOnly, append: false });
    })();
    return () => {
      active = false;
    };
  }, [gate, load, unreadOnly]);

  const markRead = async (item: NotificationItem) => {
    if (item.isRead || !client) return;
    try {
      const notifications = createNotificationClient(client);
      await notifications.markRead(item.id);
      setItems((previous) =>
        unreadOnly
          ? previous.filter((row) => row.id !== item.id)
          : previous.map((row) =>
              row.id === item.id ? { ...row, isRead: true, readAt: new Date().toISOString() } : row,
            ),
      );
      setUnread((count) => Math.max(0, count - 1));
      notifyNotificationsChanged();
    } catch {
      // Following the notification is the important part; the read state can
      // catch up on the next visit.
    }
  };

  const markAllRead = async () => {
    if (!client || unread === 0) return;
    setBusy(true);
    try {
      const notifications = createNotificationClient(client);
      await notifications.markAllRead();
      setItems((previous) =>
        unreadOnly
          ? []
          : previous.map((row) => ({ ...row, isRead: true, readAt: row.readAt ?? new Date().toISOString() })),
      );
      setUnread(0);
      setFailed(false);
      notifyNotificationsChanged();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (gate === "loading" || (gate === null && !loaded)) {
    return <p className="notify-state">알림을 불러오고 있습니다.</p>;
  }

  if (gate === "unconfigured") {
    return <p className="notify-state">지금은 알림을 사용할 수 없습니다.</p>;
  }

  if (gate === "unauthenticated") {
    return (
      <div className="notify-state">
        <p>알림은 로그인 후 이용할 수 있습니다.</p>
        <Link className="button button--accent" href="/login/">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="notify-center">
      {failed ? (
        <div className="notify-state">
          <p role="alert">알림을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
          <button
            className="button button--outline"
            type="button"
            onClick={() => void load(0, { unreadOnly, append: false })}
          >
            다시 시도
          </button>
        </div>
      ) : null}

      <div className="notify-center__bar">
        <p className="notify-center__count" aria-live="polite">
          읽지 않은 알림 {unread}개
        </p>
        <div className="notify-center__actions">
          <label className="notify-filter">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            읽지 않은 알림만
          </label>
          <button
            className="button button--outline"
            type="button"
            onClick={() => void markAllRead()}
            disabled={busy || unread === 0}
          >
            모두 읽음
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="notify-state">
          {unreadOnly ? "읽지 않은 알림이 없습니다." : "받은 알림이 없습니다."}
        </p>
      ) : (
        <ul className="notify-list">
          {items.map((item) => (
            <li key={item.id} className={item.isRead ? "notify-item" : "notify-item notify-item--unread"}>
              <Link
                className="notify-item__link"
                href={notificationHref(item)}
                onClick={() => void markRead(item)}
              >
                <span className="notify-item__head">
                  <span className="notify-item__type">{notificationTypeLabel(item.type)}</span>
                  <time className="notify-item__time" dateTime={item.createdAt}>
                    {formatRelativeTime(item.createdAt)}
                  </time>
                </span>
                <span className="notify-item__title">
                  {item.title}
                  {item.isRead ? null : <span className="notify-item__dot" aria-label="읽지 않음" />}
                </span>
                <span className="notify-item__body">{item.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <button
          className="button button--outline notify-center__more"
          type="button"
          onClick={() => void load(items.length, { unreadOnly, append: true })}
          disabled={busy}
        >
          더 보기
        </button>
      ) : null}
    </div>
  );
}