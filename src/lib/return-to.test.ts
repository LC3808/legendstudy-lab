import { describe, expect, it } from "vitest";

import { appendReturnPath, getSafeReturnPath, getAuthReturnPath } from "./return-to";

describe("getSafeReturnPath", () => {
  it("accepts an internal path with query and hash", () => {
    expect(getSafeReturnPath("/account/?notice=welcome#profile")).toBe("/account/?notice=welcome#profile");
  });

  it("fails closed for external and malformed return paths", () => {
    expect(getSafeReturnPath("https://example.com")).toBe("/");
    expect(getSafeReturnPath("//example.com")).toBe("/");
    expect(getSafeReturnPath("\\\\example.com")).toBe("/");
  });

  it("serializes only a safe internal return target", () => {
    expect(appendReturnPath("/login/", "/account/")).toBe("/login/?next=%2Faccount%2F");
    expect(appendReturnPath("/login/", "https://example.com")).toBe("/login/?next=%2F");
  });
});

describe("post-login destinations", () => {
  it.each(["/login/", "/signup/?next=/login/", "/auth/kakao/", "/api/auth/kakao/callback/", "/%6cogin/", "/reset-password/"])("prevents an auth loop to %s", (path) => {
    expect(getAuthReturnPath(path)).toBe("/account/");
  });
  it("preserves personal and known-good payment destinations", () => {
    for (const path of ["/account/", "/essay-lab/", "/payments/checkout/?sku=3c", "/payments/success/?orderId=example"]) expect(getAuthReturnPath(path)).toBe(path);
    expect(getAuthReturnPath("https://outside.example/")).toBe("/");
  });
});
