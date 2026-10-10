import { describe, expect, it } from "vitest";

import { buildPublicMetadata } from "./brand";
import {
  authenticatedProductRoutes,
  indexablePublicPaths,
  internalFoundationPathPrefixes,
  policyRoutes,
  publicReleasePaths,
  publicReleaseRoutes,
} from "./release-routes";

describe("release routes", () => {
  it("preserves the canonical root and stable public entry paths", () => {
    expect(publicReleasePaths).toEqual(["/", "/pricing/"]);
    expect(policyRoutes.map((route) => route.href)).toEqual([
      "/privacy/",
      "/terms/",
      "/refund/",
      "/support/",
      "/account-deletion/",
    ]);
    expect(internalFoundationPathPrefixes).toContain("/lab");
    expect(internalFoundationPathPrefixes).toContain("/essay-lab");
  });

  /**
   * NAV hotfix: the public header reaches the sale conditions through /pricing/,
   * never through the release-scope pages, and never through two labels that
   * point at the same page.
   */
  it("routes the public menu 이용 안내 to /pricing/ and nowhere near the scope pages", () => {
    const usage = publicReleaseRoutes.filter((route) => route.label === "이용 안내");
    expect(usage.map((route) => route.href)).toEqual(["/pricing/"]);
    for (const route of publicReleaseRoutes) {
      expect(route.href).not.toBe("/lab/how-it-works/");
    }
    const destinations = publicReleaseRoutes.map((route) => route.href);
    expect(new Set(destinations).size).toBe(destinations.length);
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
      "/score-analysis/",
      "/exam-analysis/",
      "/essay-lab/",
      "/pricing/",
    ]);
    expect(authenticatedProductRoutes.map((route) => route.label)).toEqual([
      "내신 LAB",
      "수능 LAB",
      "논술 LAB",
      "이용 안내",
    ]);
    // The account and support entries live in the header action cluster and in
    // MY, so the product menu carries only the three service axes.
    for (const label of ["마이페이지", "내 기록", "고객센터", "계정 설정"]) {
      expect(authenticatedProductRoutes.map((route) => route.label)).not.toContain(label);
    }
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
