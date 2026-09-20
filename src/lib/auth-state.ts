import type { AuthChangeEvent, User } from "@supabase/supabase-js";

export type PublicAuthUser = Pick<User, "id" | "email">;

export type AuthSnapshot = {
  user: PublicAuthUser | null;
  recoveryActive: boolean;
};

export function nextAuthSnapshot(
  current: AuthSnapshot,
  event: AuthChangeEvent,
  user: PublicAuthUser | null,
): AuthSnapshot {
  if (event === "SIGNED_OUT") return { user: null, recoveryActive: false };
  if (event === "PASSWORD_RECOVERY") return { user, recoveryActive: true };
  if (event === "USER_UPDATED" || event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
    return { user, recoveryActive: user ? current.recoveryActive : false };
  }
  return { user, recoveryActive: user ? current.recoveryActive : false };
}
