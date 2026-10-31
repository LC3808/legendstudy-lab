// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { Notices, NoticeDetail, NoticeNavLink } from "./notices";
import { AdminNotices } from "./admin/admin-notices";
const env = vi.hoisted(() => ({
  rpc: vi.fn(),
  status: "authenticated",
  user: { id: "u1" } as { id: string } | null,
}));
vi.mock("./auth-context", () => {
  const client = { rpc: env.rpc };
  return { useAuth: () => ({ client, status: env.status, user: env.user }) };
});
const n = {
  notice_id: "n1",
  title: "서비스 공지",
  content: "내용\n<script>alert(1)</script>",
  category: "general",
  status: "published",
  is_pinned: true,
  is_public: true,
  show_app: true,
  show_web: true,
  published_at: "2026-10-31T00:00:00Z",
  expires_at: null,
  updated_at: "2026-10-31T00:00:00Z",
  is_read: false,
};
beforeEach(() => {
  env.rpc.mockReset();
  env.status = "authenticated";
  env.user = { id: "u1" };
  window.history.replaceState({}, "", "/notices/detail/?id=n1");
});
afterEach(cleanup);
describe("notices UI", () => {
  it("lists published DTOs and unread badge", async () => {
    env.rpc.mockResolvedValue({
      data: { items: [n], total: 21, unread: 1 },
      error: null,
    });
    render(<Notices />);
    expect(await screen.findByText("서비스 공지")).toBeVisible();
    expect(screen.getByText("읽지 않은 공지 1개")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(env.rpc).toHaveBeenCalledWith("notice_list", {
        p_channel: "web",
        p_offset: 20,
        p_limit: 20,
      }),
    );
  });
  it("renders plain content safely and marks same version read", async () => {
    env.rpc.mockImplementation((name: string) =>
      Promise.resolve({
        data: name === "notice_detail" ? n : true,
        error: null,
      }),
    );
    render(<NoticeDetail />);
    expect(await screen.findByText(/<script>/)).toBeVisible();
    expect(document.querySelector("article script")).toBeNull();
    await waitFor(() =>
      expect(env.rpc).toHaveBeenCalledWith("notice_mark_read", {
        p_notice_id: "n1",
        p_channel: "web",
        p_updated_at: n.updated_at,
      }),
    );
  });
  it("guest never saves receipts", async () => {
    env.status = "anonymous";
    env.user = null;
    env.rpc.mockResolvedValue({ data: n, error: null });
    render(<NoticeDetail />);
    await screen.findByText("서비스 공지");
    expect(env.rpc).toHaveBeenCalledTimes(1);
  });
  it("hidden or expired detail is honest and has no read write", async () => {
    env.rpc.mockResolvedValue({ data: null, error: null });
    render(<NoticeDetail />);
    expect(await screen.findByText(/게시가 종료/)).toBeVisible();
    expect(env.rpc).toHaveBeenCalledTimes(1);
  });
  it("failed receipt keeps content and reports unsynced state", async () => {
    env.rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === "notice_detail"
          ? { data: n, error: null }
          : { data: null, error: { message: "offline" } },
      ),
    );
    render(<NoticeDetail />);
    expect(await screen.findByText(/읽음 상태를 저장하지/)).toBeVisible();
    expect(screen.getByText("서비스 공지")).toBeVisible();
  });
  it("logout clears unread count immediately", async () => {
    env.rpc.mockResolvedValue({
      data: { items: [n], total: 1, unread: 1 },
      error: null,
    });
    const { rerender } = render(<NoticeNavLink />);
    await screen.findByText("공지사항 (1)");
    env.user = null;
    env.status = "anonymous";
    rerender(<NoticeNavLink />);
    expect(screen.queryByText("공지사항 (1)")).toBeNull();
    expect(screen.getByText("공지사항")).toBeVisible();
  });
  it("admin uses archive rather than delete; forbidden save shown as failure", async () => {
    env.rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === "notice_admin_list"
          ? { data: { items: [n], total: 1 }, error: null }
          : { data: null, error: { code: "42501" } },
      ),
    );
    render(<AdminNotices />);
    fireEvent.click(
      await screen.findByRole("button", { name: "서비스 공지 · published" }),
    );
    fireEvent.change(screen.getByLabelText("상태"), {
      target: { value: "archived" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText(/저장하지 못했습니다/);
    expect(env.rpc).toHaveBeenCalledWith("notice_admin_save", {
      p: expect.objectContaining({
        notice_id: "n1",
        updated_at: n.updated_at,
        status: "archived",
      }),
    });
  });
});
