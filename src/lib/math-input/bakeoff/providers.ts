/**
 * MATH-3C-1 — deterministic mock benchmark provider FACTORIES. Each turns a fixture into a MATH-3B
 * `VisionProviderAdapter` (the required provider-independent boundary). NO live/paid provider call.
 *
 * A real-provider factory (MATH-3C-2) would ignore the expected facts and call the API with
 * `fixture.artifacts`, then map/align its output onto region slots. These mocks synthesize output
 * from the expected facts per a quality profile so the scorer can be validated now.
 */

import { createStaticAdapter } from "../mock-adapter";
import type { ConfidenceBand, RegionType, VisionProviderAdapter, VisionRegion } from "../types";
import type { BenchmarkFixture, ExpectedRegion } from "./types";

export type BenchmarkProviderFactory = (fixture: BenchmarkFixture) => VisionProviderAdapter;

function regionTypeForRole(expected: ExpectedRegion): RegionType {
  switch (expected.role) {
    case "REASONING_TEXT":
      return "TEXT";
    case "GRAPH":
      return "GRAPH_REGION";
    case "DIAGRAM":
      return "DIAGRAM_REGION";
    case "TABLE":
      return "TABLE_REGION";
    default:
      return "MATH";
  }
}

function toRegion(
  expected: ExpectedRegion,
  overrides: Partial<VisionRegion> = {},
): VisionRegion {
  return {
    regionId: expected.regionId,
    pageIndex: expected.pageIndex,
    readingOrder: expected.readingOrder,
    regionType: regionTypeForRole(expected),
    role: expected.role,
    boundingBox: { x0: 0, y0: 0, x1: 1, y1: 1 },
    rawText: expected.expectedRawText,
    normalizedMath: expected.expectedNormalizedMath,
    structuralHints: [],
    confidence: "HIGH",
    uncertaintyReason: null,
    evidenceRef: `evidence://bakeoff/${expected.regionId}`,
    subproblemCandidate: null,
    ...overrides,
  };
}

function corrupt(text: string): string {
  // Deterministic, meaning-changing corruption (e.g. x^2 -> x^3, - -> +, \le -> <).
  if (text.includes("^2")) return text.replace("^2", "^3");
  if (text.trim() === "-") return "+";
  if (text.includes("\\le")) return text.replace("\\le", "<");
  if (text.includes(">=")) return text.replace(">=", ">");
  return `${text}~`;
}

/** Perfect oracle: every region correct + HIGH confidence. Upper reference, not a "winner". */
export function createOracleFactory(): BenchmarkProviderFactory {
  return (fixture) =>
    createStaticAdapter("mock-oracle", "oracle-1", {
      regions: fixture.expectedRegions.map((e) => toRegion(e)),
      providerStatus: "OK",
    });
}

/** Overconfident: corrupts the named regions but reports HIGH confidence (false confidence). */
export function createOverconfidentFactory(regionIds: string[]): BenchmarkProviderFactory {
  const targets = new Set(regionIds);
  return (fixture) =>
    createStaticAdapter("mock-overconfident", "overconfident-1", {
      regions: fixture.expectedRegions.map((e) =>
        targets.has(e.regionId)
          ? toRegion(e, {
              rawText: corrupt(e.expectedRawText),
              normalizedMath: e.expectedNormalizedMath ? corrupt(e.expectedNormalizedMath) : null,
              confidence: "HIGH",
            })
          : toRegion(e),
      ),
      providerStatus: "OK",
    });
}

/** Cautious: gets the named regions wrong but FLAGS uncertainty (safe failure). */
export function createCautiousFactory(
  regionIds: string[],
  band: ConfidenceBand = "AMBIGUOUS",
): BenchmarkProviderFactory {
  const targets = new Set(regionIds);
  return (fixture) =>
    createStaticAdapter("mock-cautious", "cautious-1", {
      regions: fixture.expectedRegions.map((e) =>
        targets.has(e.regionId)
          ? toRegion(e, {
              rawText: corrupt(e.expectedRawText),
              normalizedMath: e.expectedNormalizedMath ? corrupt(e.expectedNormalizedMath) : null,
              confidence: band,
              uncertaintyReason: "SYMBOL_AMBIGUITY",
            })
          : toRegion(e),
      ),
      providerStatus: "OK",
    });
}

/**
 * Underconfident: reads the named regions CORRECTLY but reports low confidence. Useful to show that a
 * fallback which AGREES upgrades an uncertain-but-correct region to confident (legitimate fallback use).
 */
export function createUnderconfidentFactory(
  regionIds: string[],
  band: ConfidenceBand = "AMBIGUOUS",
): BenchmarkProviderFactory {
  const targets = new Set(regionIds);
  return (fixture) =>
    createStaticAdapter("mock-underconfident", "underconfident-1", {
      regions: fixture.expectedRegions.map((e) =>
        targets.has(e.regionId)
          ? toRegion(e, { confidence: band, uncertaintyReason: "MODEL_LOW_CONFIDENCE" })
          : toRegion(e),
      ),
      providerStatus: "OK",
    });
}

/** Omits the named regions entirely (missed regions). */
export function createMissingFactory(regionIds: string[]): BenchmarkProviderFactory {
  const targets = new Set(regionIds);
  return (fixture) =>
    createStaticAdapter("mock-missing", "missing-1", {
      regions: fixture.expectedRegions.filter((e) => !targets.has(e.regionId)).map((e) => toRegion(e)),
      providerStatus: "OK",
    });
}
