import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { noticesClient, type Notice } from "./client";
describe("shared notices RPC contract", () => {
  it("WEB uses shared RPCs and read version, never supplies a user ID", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const api = noticesClient({ rpc } as unknown as SupabaseClient);
    await api.list(20);
    await api.detail("n1");
    await api.markRead({ notice_id: "n1", updated_at: "t1" } as Notice);
    expect(rpc.mock.calls).toEqual([
      ["notice_list", { p_channel: "web", p_offset: 20, p_limit: 20 }],
      ["notice_detail", { p_notice_id: "n1", p_channel: "web" }],
      [
        "notice_mark_read",
        { p_notice_id: "n1", p_channel: "web", p_updated_at: "t1" },
      ],
    ]);
  });
  it("does not swallow server permission failures", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ error: { code: "42501" }, data: null });
    await expect(
      noticesClient({ rpc } as unknown as SupabaseClient).adminList(),
    ).rejects.toEqual({ code: "42501" });
  });
});
