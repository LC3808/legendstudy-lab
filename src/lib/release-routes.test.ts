import { describe, expect, it } from "vitest";

import { brand, buildPublicMetadata } from "./brand";
import { internalFoundationPathPrefixes, policyRoutes, publicReleasePaths } from "./release-routes";

describe("release routes", () => {
  it("preserves the stable LS LAB public entry paths", () => {
    expect(publicReleasePaths).toEqual(["/lab", "/lab/how-it-works", "/lab/coverage"]);
    expect(policyRoutes.map((route) => route.href)).toEqual(["/privacy", "/terms", "/support", "/account-deletion"]);
    expect(internalFoundationPathPrefixes).toContain("/essay-lab");
  });

  it("does not claim an indexing canonical before an Owner supplies a final origin", () => {
    expect(brand.siteUrl).toBeUndefined();
    const metadata = buildPublicMetadata("LS LAB", "release foundation", "/lab");
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("keeps draft policy pages noindex even after a canonical origin is supplied", () => {
    const metadata = buildPublicMetadata("Privacy", "draft", "/privacy", { index: false });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
