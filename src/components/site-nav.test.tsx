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

describe("SiteNav session-aware header", () => {
  it("shows the public menu for an anonymous session", () => {
    renderWithStatus("anonymous");
    expect(screen.getByRole("link", { name: "서비스" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "성적 분석" })).not.toBeInTheDocument();
  });

  it("shows the authenticated product menu once signed in", () => {
    renderWithStatus("authenticated");
    for (const label of ["홈", "성적 분석", "논술 LAB", "내 기록", "마이페이지"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: "서비스" })).not.toBeInTheDocument();
  });

  it("does not show the authenticated menu before the session is known", () => {
    renderWithStatus("loading");
    expect(screen.queryByRole("link", { name: "성적 분석" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "서비스" })).toBeInTheDocument();
  });
});
