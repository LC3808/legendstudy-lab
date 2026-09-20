// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "@/components/auth-context";
import { AuthForm } from "@/components/auth-forms";

describe("AuthForm", () => {
  it("fails closed when browser Supabase configuration is absent", () => {
    render(<AuthProvider><AuthForm mode="login" /></AuthProvider>);

    expect(screen.getByRole("heading", { name: /계정 연결을\s*준비하고 있습니다/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("이메일")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "로그인" })).not.toBeInTheDocument();
  });
});
