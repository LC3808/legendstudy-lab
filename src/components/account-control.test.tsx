// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountControl } from "@/components/account-control";
import { AuthContext, type AuthContextValue } from "@/components/auth-context";

const credit = vi.hoisted(() => ({ state: { status: "loading" } as import("./credit-balance").CreditState }));
vi.mock("./credit-balance", () => ({ useCreditSummary: () => ({ state: credit.state }) }));
beforeEach(() => { credit.state = { status: "loading" }; });

function renderWithStatus(status: AuthContextValue["status"]) {
  const value: AuthContextValue = {
    client: null,
    status,
    user: status === "authenticated" ? { id: "user-1", email: "student@example.com" } : null,
    recoveryActive: false,
    completeRecovery: () => {},
    signOut: async () => {},
  };
  return render(<AuthContext.Provider value={value}><AccountControl /></AuthContext.Provider>);
}

describe("header action cluster", () => {
  /**
   * NAV hotfix. The signed-in header used to send 이용 안내 to the release-scope
   * page, which is not what the label promises: the Owner's intended destination
   * is the sale conditions on /pricing/.
   */
  it("keeps MY in the signed-in actions and avoids duplicating the shared guide link", () => {
    renderWithStatus("authenticated");
    // Next normalizes a generated trailing slash, so compare the route itself.
    const route = (name: string) =>
      screen.getByRole("link", { name }).getAttribute("href")?.replace(/\/$/, "");
    expect(screen.queryByRole("link", { name: "이용 안내" })).not.toBeInTheDocument();
    expect(route("마이페이지")).toBe("/account");
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toContain("how-it-works");
    }
  });

  it("carries no account-settings, support or scope entry", () => {
    renderWithStatus("authenticated");
    for (const label of ["계정 설정", "고객센터", "공개 범위", "이용 방법"]) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  });

  it("keeps the auth contract for the other session states", () => {
    const route = (name: string) =>
      screen.getByRole("link", { name }).getAttribute("href")?.replace(/\/$/, "");
    const { unmount } = renderWithStatus("anonymous");
    expect(route("로그인")).toBe("/login");
    unmount();

    const unconfigured = renderWithStatus("unconfigured");
    expect(route("로그인")).toBe("/login");
    unconfigured.unmount();
  });
});

it.each(["loading", "error"] as const)("does not invent a zero balance for %s", (status) => {
  credit.state = { status };
  renderWithStatus("authenticated");
  expect(screen.queryByText(/첨삭권 \d/)).not.toBeInTheDocument();
});
it("reads the header balance from the canonical DTO", () => {
  credit.state = { status: "ready", value: { dto_version: "credit-v1", spendable: 7, paid: 4, free: 3, other: 0, next_expiry: null } };
  renderWithStatus("authenticated");
  expect(screen.getByText("첨삭권 7")).toBeInTheDocument();
});
