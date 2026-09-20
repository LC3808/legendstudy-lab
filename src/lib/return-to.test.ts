import { describe, expect, it } from "vitest";

import { appendReturnPath, getSafeReturnPath } from "./return-to";

describe("getSafeReturnPath", () => {
  it("accepts an internal path with query and hash", () => {
    expect(getSafeReturnPath("/account/?notice=welcome#profile")).toBe("/account/?notice=welcome#profile");
  });

  it("fails closed for external and malformed return paths", () => {
    expect(getSafeReturnPath("https://example.com")).toBe("/account/");
    expect(getSafeReturnPath("//example.com")).toBe("/account/");
    expect(getSafeReturnPath("\\\\example.com")).toBe("/account/");
  });

  it("serializes only a safe internal return target", () => {
    expect(appendReturnPath("/login/", "/account/")).toBe("/login/?next=%2Faccount%2F");
    expect(appendReturnPath("/login/", "https://example.com")).toBe("/login/?next=%2Faccount%2F");
  });
});
