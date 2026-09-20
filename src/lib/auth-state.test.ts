import { describe, expect, it } from "vitest";

import { nextAuthSnapshot } from "./auth-state";

const user = { id: "user-1", email: "student@example.com" };

describe("nextAuthSnapshot", () => {
  it("retains a current user across ordinary auth refresh events", () => {
    expect(nextAuthSnapshot({ user, recoveryActive: false }, "TOKEN_REFRESHED", user)).toEqual({ user, recoveryActive: false });
  });

  it("opens recovery mode only for a password recovery event", () => {
    expect(nextAuthSnapshot({ user: null, recoveryActive: false }, "PASSWORD_RECOVERY", user)).toEqual({ user, recoveryActive: true });
  });

  it("clears the user and recovery flag for any signed-out event", () => {
    expect(nextAuthSnapshot({ user, recoveryActive: true }, "SIGNED_OUT", null)).toEqual({ user: null, recoveryActive: false });
  });
});
