// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useAuth } from "./auth-context";
import { AuthForm } from "./auth-forms";
vi.mock("./auth-context", () => ({ useAuth: vi.fn() }));
const routerQuery = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(routerQuery.value) }));
const signInWithPassword = vi.fn();
const signUp = vi.fn();
const resetPasswordForEmail = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  routerQuery.value = "";
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

it("shows concise login copy and retains the form and recovery links", () => {
  render(<AuthForm mode="login" />);
  expect(screen.getByRole("heading", { name: "로그인" })).toBeInTheDocument();
  expect(screen.getByText("하나의 계정으로 모든 서비스를 이용하세요.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "비밀번호 찾기" })).toHaveAttribute("href", "/forgot-password");
  expect(screen.getByRole("link", { name: "회원가입" })).toBeInTheDocument();
  expect(screen.queryByText("LEGENDSTUDY ACCOUNT / LOGIN")).not.toBeInTheDocument();
});

it("tracks router next during client navigation rather than capturing stale browser history", () => {
  routerQuery.value = "next=%2Faccount%2F";
  const { rerender } = render(<AuthForm mode="login" />);
  expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup?next=%2Faccount%2F");
  routerQuery.value = "next=%2Fessay-lab%2F";
  rerender(<AuthForm mode="login" />);
  expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup?next=%2Fessay-lab%2F");
});

it('shows confirmation completion without redirecting or promising a bonus',()=>{
 routerQuery.value='confirmed=1&next=%2Faccount%2F';
 vi.mocked(useAuth).mockReturnValue({...useAuth(),status:'authenticated',user:{id:'u'}});
 render(<AuthForm mode="login"/>);
 expect(screen.getByRole('heading',{name:'이메일 인증이 완료되었습니다'})).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'계속하기'})).toHaveAttribute('href','/account');
 expect(screen.queryByRole('button',{name:'로그인'})).toBeNull();
});
it('replaces the original signup tab form after cross-tab sign-in',()=>{
 vi.mocked(useAuth).mockReturnValue({...useAuth(),status:'authenticated',user:{id:'u'}});
 render(<AuthForm mode="signup"/>);
 expect(screen.getByRole('heading',{name:'로그인되었습니다'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'회원가입'})).toBeNull();
});
