/**
 * MATH-3B — confidence bands + criticality (MATH-3A §18, §20). Criticality depends on
 * region role × response_format, NOT on confidence alone. Low confidence never silently becomes a
 * student error (MATH-3A I4); it routes to confirmation/escalation.
 */

import type { ConfidenceBand, MathResponseFormat, RegionRole, VisionRegion } from "./types";

const UNCERTAIN_BANDS: ReadonlySet<ConfidenceBand> = new Set<ConfidenceBand>([
  "LOW",
  "AMBIGUOUS",
  "UNREADABLE",
]);

/** A band that is not HIGH/MEDIUM needs review. */
export function isUncertain(confidence: ConfidenceBand): boolean {
  return UNCERTAIN_BANDS.has(confidence);
}

/** Unreadable regions cannot be resolved by confirmation alone; they need re-upload. */
export function isUnreadable(confidence: ConfidenceBand): boolean {
  return confidence === "UNREADABLE";
}

/** Roles whose misread changes the mathematics regardless of format. */
const ALWAYS_CRITICAL_ROLES: ReadonlySet<RegionRole> = new Set<RegionRole>([
  "FINAL_ANSWER",
  "OPERATOR_SIGN",
  "EXPONENT",
  "INTEGRATION_BOUND",
  "INEQUALITY_DIRECTION",
  "SUBPROBLEM_MARKER",
  "VARIABLE_IDENTITY",
]);

/**
 * Is this region role critical for the given response format?
 *
 * - SHORT_ANSWER: only the final answer (and its constituent symbols) is critical; reasoning text
 *   is irrelevant (brevity is not an error, MATH-3A §48).
 * - SHORT_REASONING / FULL_SOLUTION / PROOF: the always-critical symbol roles are critical; plain
 *   reasoning/visual prose is not, unless it is one of those roles.
 */
export function isCriticalRole(role: RegionRole, responseFormat: MathResponseFormat): boolean {
  if (responseFormat === "SHORT_ANSWER") {
    return role === "FINAL_ANSWER";
  }
  return ALWAYS_CRITICAL_ROLES.has(role);
}

/** A region blocks evaluation only when it is both uncertain AND critical for the format. */
export function isBlockingRegion(region: VisionRegion, responseFormat: MathResponseFormat): boolean {
  return isUncertain(region.confidence) && isCriticalRole(region.role, responseFormat);
}

/** Regions that must be resolved (confirmed/corrected or escalated) before evaluation. */
export function blockingRegions(
  regions: VisionRegion[],
  responseFormat: MathResponseFormat,
): VisionRegion[] {
  return regions.filter((region) => isBlockingRegion(region, responseFormat));
}
