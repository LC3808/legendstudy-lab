/**
 * MATH-3B — student extraction confirmation (MATH-3A §21, §44).
 *
 * A confirmation is EXTRACTION_CONFIRMATION, NOT a re-solve: it produces a new confirmed extraction
 * version (append-only; the predecessor run is retained by the caller), retains the provider
 * candidate as provenance, never rewrites the original image, never consumes reevaluation
 * eligibility, and never changes the student's submitted mathematics (MATH-6A §3).
 */

import type {
  ConfirmedRegionCorrection,
  ExtractionRun,
  VisionRegion,
} from "./types";

export type ConfirmationRejectionReason =
  | "WRONG_ATTEMPT"
  | "STALE_EXTRACTION_VERSION"
  | "UNKNOWN_REGION"
  | "NO_CORRECTIONS";

export interface ConfirmationInput {
  regionId: string;
  confirmedRawText: string;
  confirmedNormalizedMath?: string | null;
  /** true = student accepted the provider candidate as-is; false = student corrected it. */
  acceptedAsIs: boolean;
}

export interface ApplyConfirmationParams {
  attemptId: string;
  /** The extraction version the student was shown; a mismatch is rejected as stale (MATH-3A §22). */
  expectedExtractionVersion: number;
  run: ExtractionRun;
  corrections: ConfirmationInput[];
  clock?: () => string;
}

export interface ConfirmationResult {
  /** Marks this explicitly as a non-resolve event. */
  readonly kind: "EXTRACTION_CONFIRMATION";
  status: "CONFIRMED" | "REJECTED";
  reasons: ConfirmationRejectionReason[];
  /** New confirmed extraction run (version + 1) on success. */
  run: ExtractionRun | null;
}

const defaultClock = (): string => new Date().toISOString();

export function applyExtractionConfirmation(params: ApplyConfirmationParams): ConfirmationResult {
  const clock = params.clock ?? defaultClock;
  const { run, corrections } = params;
  const reasons: ConfirmationRejectionReason[] = [];

  if (run.attemptId !== params.attemptId) reasons.push("WRONG_ATTEMPT");
  if (run.extractionVersion !== params.expectedExtractionVersion) reasons.push("STALE_EXTRACTION_VERSION");
  if (corrections.length === 0) reasons.push("NO_CORRECTIONS");

  const regionById = new Map(run.regions.map((r) => [r.regionId, r]));
  for (const correction of corrections) {
    if (!regionById.has(correction.regionId)) reasons.push("UNKNOWN_REGION");
  }

  if (reasons.length > 0) {
    return { kind: "EXTRACTION_CONFIRMATION", status: "REJECTED", reasons: unique(reasons), run: null };
  }

  const confirmedAtIso = clock();
  const appliedCorrections: ConfirmedRegionCorrection[] = [];

  const nextRegions: VisionRegion[] = run.regions.map((region) => {
    const correction = corrections.find((c) => c.regionId === region.regionId);
    if (!correction) return region;
    const confirmedNormalizedMath =
      correction.confirmedNormalizedMath === undefined
        ? region.normalizedMath
        : correction.confirmedNormalizedMath;
    appliedCorrections.push({
      regionId: region.regionId,
      providerCandidateRawText: region.rawText,
      providerCandidateNormalizedMath: region.normalizedMath,
      confirmedRawText: correction.confirmedRawText,
      confirmedNormalizedMath,
      acceptedAsIs: correction.acceptedAsIs,
      confirmedAtIso,
    });
    // Confirmed evidence becomes HIGH confidence; the original image/evidenceRef is untouched.
    return {
      ...region,
      rawText: correction.confirmedRawText,
      normalizedMath: confirmedNormalizedMath,
      confidence: "HIGH",
      uncertaintyReason: null,
    };
  });

  const nextVersion = run.extractionVersion + 1;
  const confirmedRun: ExtractionRun = {
    extractionRunId: `${run.attemptId}#ext${nextVersion}`,
    extractionVersion: nextVersion,
    attemptId: run.attemptId,
    responseFormat: run.responseFormat,
    regions: nextRegions,
    providerProvenance: run.providerProvenance,
    mergeProvenance: run.mergeProvenance,
    corrections: [...run.corrections, ...appliedCorrections],
    previousExtractionVersion: run.extractionVersion,
    createdAtIso: confirmedAtIso,
  };

  return { kind: "EXTRACTION_CONFIRMATION", status: "CONFIRMED", reasons: [], run: confirmedRun };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
