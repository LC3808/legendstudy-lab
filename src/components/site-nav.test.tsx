// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthContext, type AuthContextValue } from "@/components/auth-context";
import { SiteNav } from "@/components/site-nav";

function renderWithStatus(status: AuthContextValue["status"]) {
  const value: AuthContextValue = {
    client: null,
    status,
    user: status === "authenticated" ? { id: "user-1", email: "student@example.com" } : null,
    recoveryActive: false,
    completeRecovery: () => {},
    signOut: async () => {},
  };
  return render(<AuthContext.Provider value={value}><SiteNav /></AuthContext.Provider>);
}

describe("product navigation", () => {
  it.each(["anonymous", "authenticated", "loading", "unconfigured"] as const)("keeps all LABs public for %s", (status) => {
    renderWithStatus(status);
    const expected = [["내신 LAB", "/score-analysis"], ["수능 LAB", "/exam-analysis"], ["논술 LAB", "/essay-lab"], ["이용 안내", "/pricing"]];
    expect(screen.getAllByRole("link")).toHaveLength(expected.length);
    for (const [name, href] of expected) expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    for (const name of ["홈", "서비스", "공개 범위"]) expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
  });
});
