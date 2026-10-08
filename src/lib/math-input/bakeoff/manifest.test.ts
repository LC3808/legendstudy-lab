import { describe, expect, it } from "vitest";

import { BENCHMARK_FIXTURES } from "./manifest";
import { BENCHMARK_CATEGORIES } from "./types";

describe("benchmark manifest", () => {
  it("covers every required category exactly once (20 fixtures)", () => {
    expect(BENCHMARK_FIXTURES).toHaveLength(20);
    const categories = BENCHMARK_FIXTURES.map((f) => f.category).sort();
    expect(categories).toEqual([...BENCHMARK_CATEGORIES].sort());
  });

  it("has unique fixture ids and unique region ids within each fixture", () => {
    const ids = BENCHMARK_FIXTURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const fixture of BENCHMARK_FIXTURES) {
      const regionIds = fixture.expectedRegions.map((r) => r.regionId);
      expect(new Set(regionIds).size).toBe(regionIds.length);
      expect(fixture.expectedRegions.length).toBeGreaterThan(0);
    }
  });

  it("every expected region is well-formed and references an admitted page", () => {
    for (const fixture of BENCHMARK_FIXTURES) {
      const pages = new Set(fixture.artifacts.map((a) => a.pageIndex));
      for (const region of fixture.expectedRegions) {
        expect(region.expectedRawText).toBeTypeOf("string");
        expect(pages.has(region.pageIndex)).toBe(true);
        expect(region.readingOrder).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("ambiguity-focused fixtures carry at least one critical region", () => {
    for (const id of ["B17", "B18", "B19"]) {
      const fixture = BENCHMARK_FIXTURES.find((f) => f.id === id)!;
      expect(fixture.expectedRegions.some((r) => r.critical)).toBe(true);
    }
  });

  it("uses only synthetic artifacts (no public URLs, typed carries text)", () => {
    for (const fixture of BENCHMARK_FIXTURES) {
      for (const artifact of fixture.artifacts) {
        if (artifact.modality === "TYPED") {
          expect(artifact.typedText).toBeTruthy();
          expect(artifact.evidenceRef).toBeNull();
        } else {
          expect(artifact.evidenceRef?.startsWith("evidence://")).toBe(true);
        }
      }
    }
  });
});
