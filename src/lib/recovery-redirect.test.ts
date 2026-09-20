import { describe, expect, it } from "vitest";

import { readResetNotice, RESET_SUCCESS_MESSAGE, RESET_SUCCESS_PATH } from "./recovery-redirect";

describe("recovery redirect contract", () => {
  it("sends a completed reset to the login page, not back to the reset screen", () => {
    expect(RESET_SUCCESS_PATH).toBe("/login/?reset=success");
    expect(RESET_SUCCESS_PATH.startsWith("/login/")).toBe(true);
  });

  it("shows the reset success notice only when arriving from a completed reset", () => {
    expect(readResetNotice("?reset=success")).toBe(RESET_SUCCESS_MESSAGE);
    expect(readResetNotice("reset=success")).toBe(RESET_SUCCESS_MESSAGE);
    expect(readResetNotice("")).toBeNull();
    expect(readResetNotice("?next=%2Fhome%2F")).toBeNull();
  });
});
