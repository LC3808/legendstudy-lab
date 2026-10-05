import { describe, expect, it } from "vitest";

import { buildPublicMetadata } from "./brand";
import {
  authenticatedProductRoutes,
  indexablePublicPaths,
  internalFoundationPathPrefixes,
  policyRoutes,
  publicReleasePaths,
} from "./release-routes";

describe("release routes", () => {
  it("preserves the canonical root and stable public entry paths", () => {
    expect(publicReleasePaths).toEqual(["/", "/lab/how-it-works/", "/pricing/", "/lab/coverage/"]);
    expect(policyRoutes.map((route) => route.href)).toEqual([
      "/privacy/",
      "/terms/",
      "/refund/",
      "/support/",
      "/support/inquiry/",
      "/account-deletion/",
    ]);
    expect(internalFoundationPathPrefixes).toContain("/lab");
    expect(internalFoundationPathPrefixes).toContain("/essay-lab");
  });

  it("keeps the pricing page reachable for reviewers and external crawlers", () => {
    for (const path of ["/pricing/", "/refund/"]) {
      expect(internalFoundationPathPrefixes.some((prefix) => path.startsWith(prefix))).toBe(false);
    }
    expect(publicReleasePaths).toContain("/pricing/");
  });

  it("keeps every sale-condition document in the indexable set", () => {
    for (const path of ["/pricing/", "/refund/", "/terms/", "/privacy/", "/support/"]) {
      expect(indexablePublicPaths).toContain(path);
    }
    expect(indexablePublicPaths).toContain("/");
    expect(indexablePublicPaths).not.toContain("/account-deletion/");
  });

  it("does not let a foundation disallow prefix shadow a public document", () => {
    // The `/lab` prefix also covers the public `/lab/how-it-works/` and
    // `/lab/coverage/` pages. robots.ts therefore lists each public path as an
    // explicit allow rule, and RFC 9309 resolves the conflict by longest match,
    // which only works while the public path is longer than the prefix.
    for (const path of indexablePublicPaths) {
      for (const prefix of internalFoundationPathPrefixes.filter((candidate) => path.startsWith(candidate))) {
        expect(path.length).toBeGreaterThan(prefix.length);
      }
    }
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
