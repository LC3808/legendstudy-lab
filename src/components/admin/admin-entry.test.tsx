// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthContext, type AuthContextValue } from "@/components/auth-context";
import { AdminEntry } from "./admin-entry";

function context(result: unknown, id = "operator-a"): AuthContextValue {
  return { status: "authenticated", user: { id }, recoveryActive: false,
    completeRecovery: () => {}, signOut: async () => {},
    client: { rpc: vi.fn(async () => ({ data: result, error: null })),
      auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id } } } })) },
    } as unknown as SupabaseClient };
}
const view = (value: AuthContextValue) => <AuthContext.Provider value={value}><AdminEntry /></AuthContext.Provider>;

describe("conditional Admin entry", () => {
  it("shows only the single entry after server authorization", async () => {
    const value = context(true);
    render(view(value));
    expect(screen.queryByRole("link")).toBeNull();
    expect(await screen.findByRole("link", { name: "관리자" })).toHaveAttribute("href", "/admin");
    expect(value.client!.rpc).toHaveBeenCalledWith("admin_operator", undefined);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
  it.each([false, null, "true", { admin: true }])("does not trust a non-boolean allow response %j", async (result) => {
    const value = context(result); render(view(value));
    await waitFor(() => expect(value.client!.rpc).toHaveBeenCalled());
    expect(screen.queryByRole("link")).toBeNull();
  });
  it.each(["anonymous", "loading", "unconfigured"] as const)("never probes for %s", async (status) => {
    const value = { ...context(true), status }; render(view(value));
    expect(value.client!.rpc).not.toHaveBeenCalled(); expect(screen.queryByRole("link")).toBeNull();
  });
  it("fails closed when the RPC is absent or denied", async () => {
    const value = context(true); vi.mocked(value.client!.rpc).mockResolvedValue({ data: null, error: { code: "PGRST202" } } as never);
    render(view(value)); await waitFor(() => expect(value.client!.rpc).toHaveBeenCalled());
    expect(screen.queryByRole("link")).toBeNull();
  });
  it("removes a previous account entry immediately and ignores a late result after logout", async () => {
    const a = context(true); const { rerender } = render(view(a));
    await screen.findByRole("link", { name: "관리자" });
    const b = context(false, "normal-b"); let resolve!: (v: unknown) => void;
    vi.mocked(b.client!.rpc).mockImplementation(() => new Promise(r => { resolve = r; }) as never);
    rerender(view(b)); expect(screen.queryByRole("link")).toBeNull();
    await waitFor(() => expect(b.client!.rpc).toHaveBeenCalled());
    rerender(view({ ...b, status: "anonymous", user: null }));
    await act(async () => resolve({ data: true, error: null }));
    expect(screen.queryByRole("link")).toBeNull();
  });
  it("rejects a response if the underlying session changed", async () => {
    const value = context(true);
    vi.mocked(value.client!.auth.getSession).mockResolvedValue({ data: { session: { user: { id: "different" } } } } as never);
    render(view(value)); await waitFor(() => expect(value.client!.rpc).toHaveBeenCalled());
    expect(screen.queryByRole("link")).toBeNull();
  });
});
