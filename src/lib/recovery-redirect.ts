/**
 * Password recovery contract (distinct from an authenticated account password
 * change). A recovery link opens a temporary recovery session that exists only
 * to set a new password. After the update succeeds the recovery session is
 * ended and the user is sent to the login page to sign in with the new
 * password; the app never leaves the user silently authenticated on the reset
 * screen.
 */
export const RESET_SUCCESS_PATH = "/login/?reset=success";

export const RESET_SUCCESS_MESSAGE =
  "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.";

/** Returns the login-page success notice when arriving from a completed reset. */
export function readResetNotice(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("reset") === "success" ? RESET_SUCCESS_MESSAGE : null;
}
