// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountControl } from "@/components/account-control";
import { AuthContext, type AuthContextValue } from "@/components/auth-context";

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
  it("sends the signed-in 이용 안내 entry to /pricing/", () => {
    renderWithStatus("authenticated");
    // Next normalizes a generated trailing slash, so compare the route itself.
    const route = (name: string) =>
      screen.getByRole("link", { name }).getAttribute("href")?.replace(/\/$/, "");
    expect(route("이용 안내")).toBe("/pricing");
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
    expect(route("계정 안내")).toBe("/account");
    unconfigured.unmount();
  });
});
