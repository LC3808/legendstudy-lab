/**
 * MATH-3B — extraction pipeline orchestration (MATH-3A §12, §40, §41, §46, §57).
 *
 * INGEST/admission → typed + primary multimodal extraction → targeted fallback on uncertain/critical
 * regions only → merge (never confidence-max on a critical region) → input acceptance gate →
 * readiness. No live provider calls here: adapters are injected (mock/deterministic in MATH-3B).
 * Extraction processing is distinct from mathematical evaluation (MATH-3A §26).
 */

import { admitMathInput } from "./admission";
import { blockingRegions, isUnreadable } from "./confidence";
import { validateProviderResult } from "./provider-validation";
import type {
  ExtractionPipelineResult,
  ExtractionProvenance,
  ExtractionRun,
  MathInputArtifact,
  MathResponseFormat,
  PipelineFailureState,
  ReadinessResult,
  ReadyForEvaluationInput,
  RecognitionContext,
  RegionMergeProvenance,
  VisionProviderAdapter,
  VisionProviderResult,
  VisionRegion,
} from "./types";

export interface RunExtractionPipelineParams {
  attemptId: string;
  responseFormat: MathResponseFormat;
  artifacts: MathInputArtifact[];
  recognitionContext?: RecognitionContext;
  /** Primary multimodal adapter (required when any image/PDF artifact is present). */
  primary?: VisionProviderAdapter;
  /** Optional targeted fallback adapter (MATH-3A §40). */
  fallback?: VisionProviderAdapter;
  /** Deterministic clock for reproducibility/tests. */
  clock?: () => string;
  /** Resolve whether an evidence reference is currently accessible (R21 abstraction). */
  evidenceAvailable?: (evidenceRef: string | null) => boolean;
}

const defaultClock = (): string => new Date().toISOString();
const defaultEvidenceAvailable = (ref: string | null): boolean =>
  ref === null || !ref.startsWith("unavailable:");

function regionsEqual(a: VisionRegion, b: VisionRegion): boolean {
  return a.rawText === b.rawText && a.normalizedMath === b.normalizedMath;
}

/** Typed input converges at the same normalized boundary with HIGH confidence (MATH-3A §33). */
function typedRegions(artifacts: MathInputArtifact[]): VisionRegion[] {
  const regions: VisionRegion[] = [];
  let order = 0;
  for (const artifact of artifacts) {
    if (artifact.modality !== "TYPED") continue;
    const text = (artifact.typedText ?? "").trim();
    regions.push({
      regionId: `${artifact.artifactId}:typed`,
      pageIndex: artifact.pageIndex,
      readingOrder: order++,
      regionType: "MATH",
      role: "FINAL_ANSWER",
      boundingBox: { x0: 0, y0: 0, x1: 1, y1: 1 },
      rawText: text,
      normalizedMath: text,
      structuralHints: [],
      confidence: "HIGH",
      uncertaintyReason: null,
      evidenceRef: artifact.evidenceRef,
      subproblemCandidate: null,
    });
  }
  return regions;
}

export async function runExtractionPipeline(
  params: RunExtractionPipelineParams,
): Promise<ExtractionPipelineResult> {
  const clock = params.clock ?? defaultClock;
  const evidenceAvailable = params.evidenceAvailable ?? defaultEvidenceAvailable;

  const admission = admitMathInput(params.artifacts);
  if (admission.status === "REJECTED") {
    const failureStates = admission.reasons.map(mapAdmissionReason);
    return {
      admission,
      run: null,
      readiness: {
        status: "INPUT_FAILED",
        failureStates: unique(failureStates),
        confirmationRequired: [],
        readyInput: null,
      },
    };
  }

  const ordered = admission.orderedArtifacts;
  const admittedPages = ordered.map((a) => a.pageIndex);
  const visualArtifacts = ordered.filter((a) => a.modality !== "TYPED");

  // Evidence availability gate (R21 abstraction) before any extraction.
  if (visualArtifacts.some((a) => !evidenceAvailable(a.evidenceRef))) {
    return failReadiness(admission, "EVIDENCE_UNAVAILABLE", "NEEDS_REUPLOAD");
  }

  const providerProvenance: ExtractionProvenance[] = [];
  const mergeProvenance: RegionMergeProvenance[] = [];
  let regions: VisionRegion[] = typedRegions(ordered);

  if (visualArtifacts.length > 0) {
    if (!params.primary) {
      return failReadiness(admission, "EXTRACTION_FAILED", "INPUT_FAILED");
    }
    const primaryRaw = await params.primary.extract({
      attemptId: params.attemptId,
      responseFormat: params.responseFormat,
      artifacts: visualArtifacts,
      recognitionContext: params.recognitionContext,
    });
    const primary = validateProviderResult(primaryRaw, admittedPages);
    providerProvenance.push(toProvenance(primary, "PRIMARY"));
    if (primary.providerStatus !== "OK") {
      return failReadiness(admission, "EXTRACTION_FAILED", "INPUT_FAILED");
    }
    regions = [...regions, ...primary.regions];

    // Targeted fallback: only uncertain + critical regions (MATH-3A §40). Never double-process all.
    const blocking = blockingRegions(primary.regions, params.responseFormat);
    if (blocking.length > 0 && params.fallback) {
      const fallbackRaw = await params.fallback.extract({
        attemptId: params.attemptId,
        responseFormat: params.responseFormat,
        artifacts: visualArtifacts,
        recognitionContext: params.recognitionContext,
        targetRegionIds: blocking.map((r) => r.regionId),
      });
      const fallback = validateProviderResult(fallbackRaw, admittedPages);
      providerProvenance.push(toProvenance(fallback, "FALLBACK"));
      const fallbackById = new Map(fallback.regions.map((r) => [r.regionId, r]));
      regions = regions.map((region) => {
        if (!blocking.some((b) => b.regionId === region.regionId)) return region;
        const alt = fallbackById.get(region.regionId);
        const { merged, provenance } = mergeRegion(region, alt, fallback, params);
        mergeProvenance.push(provenance);
        return merged;
      });
    }
  }

  regions = [...regions].sort(
    (a, b) => a.pageIndex - b.pageIndex || a.readingOrder - b.readingOrder,
  );

  const version = 1;
  const run: ExtractionRun = {
    extractionRunId: `${params.attemptId}#ext${version}`,
    extractionVersion: version,
    attemptId: params.attemptId,
    responseFormat: params.responseFormat,
    regions,
    providerProvenance,
    mergeProvenance,
    corrections: [],
    previousExtractionVersion: null,
    createdAtIso: clock(),
  };

  return { admission, run, readiness: assessReadiness(run, ordered) };
}

/** Merge one blocking region with its fallback candidate (MATH-3A §41). */
function mergeRegion(
  primaryRegion: VisionRegion,
  alt: VisionRegion | undefined,
  fallback: VisionProviderResult,
  params: RunExtractionPipelineParams,
): { merged: VisionRegion; provenance: RegionMergeProvenance } {
  const base: Omit<RegionMergeProvenance, "decision" | "rationale"> = {
    regionId: primaryRegion.regionId,
    primaryProviderId: params.primary?.providerId ?? "unknown",
    fallbackProviderId: params.fallback?.providerId ?? null,
  };

  if (fallback.providerStatus !== "OK" || !alt) {
    // No usable second opinion → keep primary; still blocking → confirmation (never guess).
    return {
      merged: primaryRegion,
      provenance: {
        ...base,
        decision: "STUDENT_CONFIRMATION_REQUIRED",
        rationale: "fallback unavailable/invalid; primary still uncertain",
      },
    };
  }

  if (regionsEqual(primaryRegion, alt)) {
    // Two independent reads agree → confident; upgrade to HIGH.
    return {
      merged: { ...primaryRegion, confidence: "HIGH", uncertaintyReason: null },
      provenance: { ...base, decision: "PRIMARY_ACCEPTED", rationale: "primary and fallback agree" },
    };
  }

  // Disagreement on a critical region: do NOT pick higher confidence — require confirmation, or
  // human review when neither read is usable.
  if (isUnreadable(primaryRegion.confidence) && isUnreadable(alt.confidence)) {
    return {
      merged: primaryRegion,
      provenance: { ...base, decision: "HUMAN_REVIEW_REQUIRED", rationale: "both reads unreadable" },
    };
  }
  return {
    merged: primaryRegion,
    provenance: {
      ...base,
      decision: "STUDENT_CONFIRMATION_REQUIRED",
      rationale: "primary and fallback disagree on a critical region",
    },
  };
}

/** Input acceptance gate (MATH-3A §46): never judges mathematics. */
function assessReadiness(run: ExtractionRun, ordered: MathInputArtifact[]): ReadinessResult {
  const blocking = blockingRegions(run.regions, run.responseFormat);
  const humanReview = run.mergeProvenance.some((m) => m.decision === "HUMAN_REVIEW_REQUIRED");

  if (blocking.length === 0 && !humanReview) {
    const readyInput: ReadyForEvaluationInput = {
      dtoVersion: "math-input-ready-v1",
      attemptId: run.attemptId,
      responseFormat: run.responseFormat,
      extractionVersion: run.extractionVersion,
      pages: ordered.map((a) => ({ pageIndex: a.pageIndex })),
      regions: run.regions,
      confirmationProvenance: run.corrections,
      originalEvidenceRefs: ordered
        .map((a) => a.evidenceRef)
        .filter((ref): ref is string => ref !== null),
      providerProvenance: run.providerProvenance,
      mergeProvenance: run.mergeProvenance,
      inputGateResult: "READY_FOR_EVALUATION",
    };
    return {
      status: "READY_FOR_EVALUATION",
      failureStates: [],
      confirmationRequired: [],
      readyInput,
    };
  }

  const unreadable = blocking.some((r) => isUnreadable(r.confidence)) || humanReview;
  const failureStates: PipelineFailureState[] = ["CRITICAL_UNCERTAINTY"];
  if (!unreadable) failureStates.push("CONFIRMATION_REQUIRED");

  return {
    status: unreadable ? "NEEDS_REUPLOAD" : "NEEDS_CONFIRMATION",
    failureStates: unique(failureStates),
    confirmationRequired: blocking,
    readyInput: null,
  };
}

/** Recompute readiness after a confirmation produced a new extraction version. */
export function assessReadinessForRun(
  run: ExtractionRun,
  ordered: MathInputArtifact[],
): ReadinessResult {
  return assessReadiness(run, ordered);
}

function failReadiness(
  admission: ExtractionPipelineResult["admission"],
  failure: PipelineFailureState,
  status: ReadinessResult["status"],
): ExtractionPipelineResult {
  return {
    admission,
    run: null,
    readiness: { status, failureStates: [failure], confirmationRequired: [], readyInput: null },
  };
}

function toProvenance(
  result: VisionProviderResult,
  stage: ExtractionProvenance["stage"],
): ExtractionProvenance {
  return {
    providerId: result.providerId,
    modelId: result.modelId,
    providerStatus: result.providerStatus,
    stage,
  };
}

function mapAdmissionReason(reason: string): PipelineFailureState {
  switch (reason) {
    case "UNSUPPORTED_INPUT":
      return "UNSUPPORTED_INPUT";
    case "EMPTY_INPUT":
      return "UNSUPPORTED_INPUT";
    default:
      return "INVALID_FILE";
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
