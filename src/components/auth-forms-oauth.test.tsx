// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/components/auth-context";
import { AuthForm } from "@/components/auth-forms";

vi.mock("@/components/auth-context", () => ({ useAuth: vi.fn() }));

describe("AuthForm social OAuth options", () => {
  const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stlhijzpjfgwwdgunlsd.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_AUTH_PROVIDERS", "google, apple, kakao");
    signInWithOAuth.mockClear();
    vi.mocked(useAuth).mockReturnValue({
      client: { auth: { signInWithOAuth } } as never,
      status: "anonymous",
      user: null,
      recoveryActive: false,
      completeRecovery: vi.fn(),
      signOut: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("generates a Kakao authorization request with only account_email", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.click(screen.getByRole("button", { name: "Kakao로 계속하기" }));

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "kakao",
      options: expect.objectContaining({ redirectTo: expect.any(String), scopes: "account_email" }),
    });
    const options = signInWithOAuth.mock.calls[0]?.[0].options as { scopes?: string };
    expect(options.scopes?.split(" ")).toEqual(["account_email"]);
  });

  it("does not add Kakao scopes to Google or Apple", async () => {
    const user = userEvent.setup();
    const firstRender = render(<AuthForm mode="login" />);

    await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(signInWithOAuth.mock.calls[0]?.[0]).toEqual({
      provider: "google",
      options: { redirectTo: expect.any(String) },
    });

    signInWithOAuth.mockClear();
    firstRender.unmount();
    render(<AuthForm mode="login" />);
    await user.click(screen.getByRole("button", { name: "Apple로 계속하기" }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(signInWithOAuth.mock.calls[0]?.[0]).toEqual({
      provider: "apple",
      options: { redirectTo: expect.any(String) },
    });
  });
});
