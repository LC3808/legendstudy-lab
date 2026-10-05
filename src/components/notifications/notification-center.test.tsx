// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextValue } from "@/components/auth-context";
import { NotificationCenter } from "@/components/notifications/notification-center";

const member = "22222222-2222-4222-8222-222222222222";

const inbox = {
  dto_version: "notification-v1",
  limit: 20,
  offset: 0,
  unread: 2,
  items: [
    {
      id: "aa111111-1111-4111-8111-111111111111",
      type: "inquiry_reply",
      title: "1:1 문의 답변이 도착했습니다",
      body: "문의하신 내용에 답변이 등록되었습니다.",
      target_type: "inquiry",
      target_id: "bb111111-1111-4111-8111-111111111111",
      created_at: new Date(Date.now() - 60_000).toISOString(),
      read_at: null,
      is_read: false,
    },
    {
      id: "cc111111-1111-4111-8111-111111111111",
      type: "credit_grant",
      title: "3 Credits가 지급되었습니다",
      body: "1 Credit은 논술 1회 첨삭에 사용할 수 있습니다.",
      target_type: "credit_history",
      target_id: null,
      created_at: new Date(Date.now() - 86_400_000).toISOString(),
      read_at: new Date().toISOString(),
      is_read: true,
    },
  ],
};

type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };

function makeClient(handler: (fn: string, params: Record<string, unknown>) => unknown) {
  return {
    auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }) },
    rpc: vi.fn(
      async (fn: string, params: Record<string, unknown>): Promise<RpcResult> => ({
        data: handler(fn, params),
        error: null,
      }),
    ),
  };
}

function renderWith(
  auth: Partial<AuthContextValue>,
  client: ReturnType<typeof makeClient> | null,
) {
  const value: AuthContextValue = {
    client: client as never,
    status: "authenticated",
    user: { id: member, email: "member1@legendstudy.com" },
    recoveryActive: false,
    completeRecovery: () => {},
    signOut: async () => {},
    ...auth,
  };
  return render(
    <AuthContext.Provider value={value}>
      <NotificationCenter />
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("notification inbox", () => {
  it("lists the member's notifications with type, title and body", async () => {
    renderWith({}, makeClient(() => inbox));
    expect(await screen.findByText("1:1 문의 답변이 도착했습니다")).toBeTruthy();
    expect(screen.getByText("Credit 지급")).toBeTruthy();
    expect(screen.getByText("1 Credit은 논술 1회 첨삭에 사용할 수 있습니다.")).toBeTruthy();
    expect(screen.getByText("읽지 않은 알림 2개")).toBeTruthy();
  });

  it("routes through the typed target rather than a stored URL", async () => {
    renderWith({}, makeClient(() => inbox));
    const link = await screen.findByRole("link", { name: /1:1 문의 답변이 도착했습니다/ });
    // Next normalises the trailing slash; what matters is the destination.
    expect(link.getAttribute("href")).toMatch(/^\/support\/inquiry\/?$/);
  });

  it("invites a signed-out visitor to log in", async () => {
    renderWith({ client: null, status: "anonymous", user: null }, null);
    expect(await screen.findByText("알림은 로그인 후 이용할 수 있습니다.")).toBeTruthy();
    expect(screen.queryByText(/읽지 않은 알림/)).toBeNull();
  });

  it("reports a failure instead of an empty inbox", async () => {
    const client = makeClient(() => inbox);
    client.rpc.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    renderWith({}, client);
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("asks for the unread-only page when the filter is used", async () => {
    const client = makeClient(() => inbox);
    renderWith({}, client);
    await screen.findByText("1:1 문의 답변이 도착했습니다");
    screen.getByLabelText("읽지 않은 알림만").click();
    await waitFor(() => {
      const calls = client.rpc.mock.calls.filter(([fn]) => fn === "user_notifications_list");
      expect(calls.at(-1)?.[1]).toMatchObject({ p_unread_only: true });
    });
  });

  it("marks all read through the backend, never locally", async () => {
    const client = makeClient((fn) =>
      fn === "user_notifications_mark_all_read" ? 0 : inbox,
    );
    renderWith({}, client);
    await screen.findByText("1:1 문의 답변이 도착했습니다");
    screen.getByRole("button", { name: "모두 읽음" }).click();
    await waitFor(() => {
      expect(client.rpc.mock.calls.some(([fn]) => fn === "user_notifications_mark_all_read")).toBe(true);
    });
    expect(await screen.findByText("읽지 않은 알림 0개")).toBeTruthy();
  });

  it("does not offer to mark all read when nothing is unread", async () => {
    const client = makeClient(() => ({ ...inbox, unread: 0, items: [] }));
    renderWith({}, client);
    await screen.findByText("받은 알림이 없습니다.");
    expect((screen.getByRole("button", { name: "모두 읽음" }) as HTMLButtonElement).disabled).toBe(true);
  });
});