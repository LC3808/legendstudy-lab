import { describe, expect, it } from "vitest";

import { buildPublicMetadata } from "./brand";
import { authenticatedProductRoutes, internalFoundationPathPrefixes, policyRoutes, publicReleasePaths } from "./release-routes";

describe("release routes", () => {
  it("preserves the canonical root and stable public entry paths", () => {
    expect(publicReleasePaths).toEqual(["/", "/lab/how-it-works/", "/lab/coverage/"]);
    expect(policyRoutes.map((route) => route.href)).toEqual(["/privacy/", "/terms/", "/support/", "/account-deletion/"]);
    expect(internalFoundationPathPrefixes).toContain("/lab");
    expect(internalFoundationPathPrefixes).toContain("/essay-lab");
  });

  it("maps the authenticated product menu to existing foundation routes", () => {
    expect(authenticatedProductRoutes.map((route) => route.href)).toEqual([
      "/home/",
      "/score-analysis/",
      "/essay-lab/",
      "/my/essays/",
      "/account/",
    ]);
    expect(authenticatedProductRoutes.map((route) => route.label)).toEqual([
      "홈",
      "성적 분석",
      "논술 LAB",
      "내 기록",
      "마이페이지",
    ]);
  });

  it("does not claim an indexing canonical before an Owner supplies a final origin", () => {
    const metadata = buildPublicMetadata("LegendStudy LAB", "release foundation", "/lab", { canonicalOrigin: false });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("keeps draft policy pages noindex even after a canonical origin is supplied", () => {
    const metadata = buildPublicMetadata("Privacy", "draft", "/privacy", { index: false });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
