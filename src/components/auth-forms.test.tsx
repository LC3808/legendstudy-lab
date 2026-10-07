// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "@/components/auth-context";
import { AuthForm } from "@/components/auth-forms";

describe("AuthForm", () => {
  it("fails closed when browser Supabase configuration is absent", async () => {
    render(<AuthProvider><AuthForm mode="login" /></AuthProvider>);

    expect(await screen.findByText("지금은 로그인에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(screen.queryByLabelText("이메일")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "로그인" })).not.toBeInTheDocument();
  });
});
