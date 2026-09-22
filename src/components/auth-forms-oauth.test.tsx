// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/components/auth-context";
import { AuthForm } from "@/components/auth-forms";

vi.mock("@/lib/kakao-oidc", () => ({ startKakaoLogin: vi.fn().mockResolvedValue(undefined) }));
import { startKakaoLogin } from "@/lib/kakao-oidc";

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

  it("starts Kakao OIDC without calling hosted OAuth", async () => {
    render(<AuthForm mode="login" />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Kakao로 계속하기" }));
    expect(startKakaoLogin).toHaveBeenCalledWith("/home/");
    expect(signInWithOAuth).not.toHaveBeenCalled();
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
