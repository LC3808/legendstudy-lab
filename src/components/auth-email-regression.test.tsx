// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useAuth } from "./auth-context";
import { AuthForm } from "./auth-forms";
vi.mock("./auth-context", () => ({ useAuth: vi.fn() }));
const signInWithPassword = vi.fn();
const signUp = vi.fn();
const resetPasswordForEmail = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ client: { auth: { signInWithPassword, signUp, resetPasswordForEmail } } as never,
    status: "anonymous", user: null, recoveryActive: false, completeRecovery: vi.fn(), signOut: vi.fn() });
});
function email() { fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "student@example.test" } }); }
function password() { fireEvent.change(screen.getByLabelText("비밀번호", { exact: true }), { target: { value: "test-password" } }); }
it("keeps email/password request and safe failure copy", async () => {
  signInWithPassword.mockResolvedValue({ error: new Error("private") });
  render(<AuthForm mode="login" />); email(); password();
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({ email: "student@example.test", password: "test-password" }));
  expect(await screen.findByRole("alert")).not.toHaveTextContent("private");
});
it("preserves signup confirmation-pending semantics", async () => {
  signUp.mockResolvedValue({ data: { session: null }, error: null });
  render(<AuthForm mode="signup" />); email(); password();
  fireEvent.change(screen.getByLabelText("비밀번호 확인"), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
  expect(await screen.findByRole("status")).toHaveTextContent("이메일 확인");
  expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ email: "student@example.test", options: { emailRedirectTo: expect.stringContaining("/login/?next=") } }));
});
it("preserves recovery email endpoint and neutral notice", async () => {
  resetPasswordForEmail.mockResolvedValue({ error: null });
  render(<AuthForm mode="forgot" />); email();
  fireEvent.click(screen.getByRole("button", { name: "재설정 이메일 보내기" }));
  expect(await screen.findByRole("status")).toHaveTextContent("등록 여부와 관계없이");
  expect(resetPasswordForEmail).toHaveBeenCalledWith("student@example.test", { redirectTo: expect.stringContaining("/reset-password/") });
});
