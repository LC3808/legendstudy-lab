import { describe, expect, it, vi } from "vitest";

import { createNotificationClient } from "./client";
import {
  NotificationError,
  parseMarkRead,
  parseNotificationPage,
  parseUnreadCount,
} from "./contract";
import {
  formatBadge,
  formatRelativeTime,
  notificationBadgeLabel,
  notificationHref,
  notificationTypeLabel,
} from "./format";

const item = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "inquiry_reply",
  title: "1:1 문의 답변이 도착했습니다",
  body: "문의하신 내용에 답변이 등록되었습니다.",
  target_type: "inquiry",
  target_id: "22222222-2222-4222-8222-222222222222",
  created_at: "2026-10-05T01:00:00.000Z",
  read_at: null,
  is_read: false,
};

describe("notification contract", () => {
  it("parses a page", () => {
    const page = parseNotificationPage({
      dto_version: "notification-v1",
      limit: 20,
      offset: 0,
      unread: 1,
      items: [item],
    });
    expect(page.items[0].type).toBe("inquiry_reply");
    expect(page.items[0].isRead).toBe(false);
    expect(page.items[0].targetType).toBe("inquiry");
  });

  it("rejects another dto version", () => {
    expect(() =>
      parseNotificationPage({ dto_version: "admin-v1", limit: 20, offset: 0, unread: 0, items: [] }),
    ).toThrow(NotificationError);
  });

  it("refuses a target type it cannot route", () => {
    expect(() =>
      parseNotificationPage({
        dto_version: "notification-v1",
        limit: 20,
        offset: 0,
        unread: 0,
        items: [{ ...item, target_type: "https://evil.example" }],
      }),
    ).toThrow();
  });

  it("refuses a row with no body", () => {
    expect(() =>
      parseNotificationPage({
        dto_version: "notification-v1",
        limit: 20,
        offset: 0,
        unread: 0,
        items: [{ ...item, body: "" }],
      }),
    ).toThrow();
  });

  it("reads primitives tolerantly", () => {
    expect(parseUnreadCount(3)).toBe(3);
    expect(parseUnreadCount(null)).toBe(0);
    expect(parseMarkRead(true)).toBe(true);
    expect(parseMarkRead("false")).toBe(false);
  });
});

describe("notification routing", () => {
  it("sends an inquiry reply to the inquiry surface", () => {
    expect(notificationHref({ targetType: "inquiry", targetId: "x" })).toBe("/support/inquiry/");
  });

  it("sends an essay evaluation to its result, and falls back without an id", () => {
    expect(notificationHref({ targetType: "essay_evaluation", targetId: "abc" })).toBe(
      "/essay-lab/evaluation/abc",
    );
    expect(notificationHref({ targetType: "essay_evaluation", targetId: null })).toBe("/my/essays");
  });

  it("sends Credit notices to the account surface", () => {
    for (const targetType of ["credit_history", "payment_order"] as const) {
      expect(notificationHref({ targetType, targetId: null })).toBe("/account/");
    }
  });

  it("never routes to an absolute or external destination", () => {
    const href = notificationHref({ targetType: "math_evaluation", targetId: "z" });
    expect(href.startsWith("/")).toBe(true);
  });

  it("labels the P0 types", () => {
    expect(notificationTypeLabel("credit_expiry")).toBe("Credit 만료");
    expect(notificationTypeLabel("low_credit_notification")).toBe("Credit 부족");
    expect(notificationTypeLabel("something_new")).toBe("안내");
  });
});

describe("notification formatting", () => {
  const now = Date.parse("2026-10-05T12:00:00.000Z");
  it("renders coarse relative time", () => {
    expect(formatRelativeTime("2026-10-05T11:59:30.000Z", now)).toBe("방금 전");
    expect(formatRelativeTime("2026-10-05T11:30:00.000Z", now)).toBe("30분 전");
    expect(formatRelativeTime("2026-10-05T06:00:00.000Z", now)).toBe("6시간 전");
    expect(formatRelativeTime("2026-10-02T12:00:00.000Z", now)).toBe("3일 전");
    expect(formatRelativeTime("2026-08-01T12:00:00.000Z", now)).toBe("2026.08.01");
  });

  it("caps the badge and keeps an accessible label", () => {
    expect(formatBadge(0)).toBe("");
    expect(formatBadge(7)).toBe("7");
    expect(formatBadge(140)).toBe("99+");
    expect(notificationBadgeLabel(0)).toContain("없음");
    expect(notificationBadgeLabel(3)).toContain("3개");
  });
});

describe("notification client", () => {
  const session = {
    auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }) },
  };

  it("reads through the owner-scoped functions only", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { dto_version: "notification-v1", limit: 20, offset: 0, unread: 2, items: [] },
      error: null,
    });
    const client = createNotificationClient({ ...session, rpc } as never);
    await client.list({ limit: 5, unreadOnly: true });
    const [fn, params] = rpc.mock.calls[0];
    expect(fn).toBe("user_notifications_list");
    expect(params).toEqual({ p_limit: 5, p_offset: 0, p_unread_only: true });
  });

  it("bounds the page size the caller can ask for", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { dto_version: "notification-v1", limit: 50, offset: 0, unread: 0, items: [] },
      error: null,
    });
    const client = createNotificationClient({ ...session, rpc } as never);
    await client.list({ limit: 5000 });
    expect(rpc.mock.calls[0][1].p_limit).toBe(50);
  });

  it("asks the database for the count rather than counting locally", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 4, error: null });
    const client = createNotificationClient({ ...session, rpc } as never);
    expect(await client.unreadCount()).toBe(4);
    expect(rpc.mock.calls[0][0]).toBe("user_notifications_unread_count");
  });

  it("will not mark read without an id", async () => {
    const rpc = vi.fn();
    const client = createNotificationClient({ ...session, rpc } as never);
    await expect(client.markRead("")).rejects.toBeInstanceOf(NotificationError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces an expired session as an authentication error", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "PT401" } });
    const client = createNotificationClient({ ...session, rpc } as never);
    await expect(client.unreadCount()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
