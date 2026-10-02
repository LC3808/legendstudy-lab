/**
 * MATH-3B — fail-closed validation of (untrusted) provider output before it becomes a candidate
 * extraction (MATH-3A §24). Invalid output never partially publishes; it is reported as
 * INVALID_OUTPUT so the pipeline routes to EXTRACTION_FAILED rather than mis-reading.
 */

import type {
  ConfidenceBand,
  RegionRole,
  RegionType,
  VisionProviderResult,
  VisionRegion,
} from "./types";

const MAX_REGIONS = 500;
const MAX_TEXT_LEN = 20_000;

const CONFIDENCE: ReadonlySet<ConfidenceBand> = new Set<ConfidenceBand>([
  "HIGH",
  "MEDIUM",
  "LOW",
  "AMBIGUOUS",
  "UNREADABLE",
]);
const ROLE: ReadonlySet<RegionRole> = new Set<RegionRole>([
  "FINAL_ANSWER",
  "OPERATOR_SIGN",
  "EXPONENT",
  "INTEGRATION_BOUND",
  "INEQUALITY_DIRECTION",
  "SUBPROBLEM_MARKER",
  "VARIABLE_IDENTITY",
  "REASONING_TEXT",
  "FORMULA",
  "VISUAL",
  "GRAPH",
  "DIAGRAM",
  "TABLE",
  "OTHER",
]);
const REGION_TYPE: ReadonlySet<RegionType> = new Set<RegionType>([
  "TEXT",
  "MATH",
  "VISUAL_REGION",
  "GRAPH_REGION",
  "DIAGRAM_REGION",
  "TABLE_REGION",
]);

function isFraction(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function isValidRegion(region: VisionRegion, admittedPages: ReadonlySet<number>): boolean {
  if (typeof region.regionId !== "string" || region.regionId.length === 0) return false;
  if (!Number.isInteger(region.pageIndex) || !admittedPages.has(region.pageIndex)) return false;
  if (!Number.isInteger(region.readingOrder) || region.readingOrder < 0) return false;
  if (!REGION_TYPE.has(region.regionType)) return false;
  if (!ROLE.has(region.role)) return false;
  if (!CONFIDENCE.has(region.confidence)) return false;
  const { x0, y0, x1, y1 } = region.boundingBox;
  if (![x0, y0, x1, y1].every(isFraction)) return false;
  if (x0 > x1 || y0 > y1) return false;
  if (typeof region.rawText !== "string" || region.rawText.length > MAX_TEXT_LEN) return false;
  if (region.normalizedMath !== null && typeof region.normalizedMath !== "string") return false;
  if (!Array.isArray(region.structuralHints)) return false;
  return true;
}

/**
 * Returns the result unchanged when structurally valid, otherwise a result with
 * `providerStatus: "INVALID_OUTPUT"` and no regions. Unknown extra fields are ignored (never
 * inferred); duplicate region ids are rejected.
 */
export function validateProviderResult(
  result: VisionProviderResult,
  admittedPageIndexes: number[],
): VisionProviderResult {
  if (result.providerStatus !== "OK") {
    return { ...result, regions: [] };
  }
  const admitted = new Set(admittedPageIndexes);
  if (!Array.isArray(result.regions) || result.regions.length > MAX_REGIONS) {
    return { ...result, providerStatus: "INVALID_OUTPUT", regions: [] };
  }
  const seen = new Set<string>();
  for (const region of result.regions) {
    if (!isValidRegion(region, admitted) || seen.has(region.regionId)) {
      return { ...result, providerStatus: "INVALID_OUTPUT", regions: [] };
    }
    seen.add(region.regionId);
  }
  return result;
}
