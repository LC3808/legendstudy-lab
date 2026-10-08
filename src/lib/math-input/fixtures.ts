/**
 * MATH-3B — synthetic, deterministic fixtures. NO real student data (MATH-3A §19, §38). These
 * builders back the V01–V30 acceptance matrix in pipeline.test.ts.
 */

import type {
  MathInputArtifact,
  NormalizedBoundingBox,
  RegionRole,
  RegionType,
  VisionProviderResult,
  VisionRegion,
} from "./types";

const FULL_BOX: NormalizedBoundingBox = { x0: 0, y0: 0, x1: 1, y1: 1 };

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function imageArtifact(
  pageIndex: number,
  overrides: Partial<MathInputArtifact> = {},
): MathInputArtifact {
  return {
    artifactId: nextId("art"),
    modality: "IMAGE",
    mediaType: "image/png",
    byteSize: 128_000,
    pageIndex,
    evidenceRef: `evidence://local/${nextId("ev")}`,
    ...overrides,
  };
}

export function pdfArtifact(
  pageIndex: number,
  overrides: Partial<MathInputArtifact> = {},
): MathInputArtifact {
  return imageArtifact(pageIndex, { modality: "PDF", mediaType: "application/pdf", ...overrides });
}

export function typedArtifact(
  pageIndex: number,
  text: string,
  overrides: Partial<MathInputArtifact> = {},
): MathInputArtifact {
  return {
    artifactId: nextId("art"),
    modality: "TYPED",
    mediaType: "text/plain",
    byteSize: 0,
    pageIndex,
    evidenceRef: null,
    typedText: text,
    ...overrides,
  };
}

export function region(overrides: Partial<VisionRegion> = {}): VisionRegion {
  return {
    regionId: nextId("rg"),
    pageIndex: 0,
    readingOrder: 0,
    regionType: "MATH" as RegionType,
    role: "FORMULA" as RegionRole,
    boundingBox: FULL_BOX,
    rawText: "",
    normalizedMath: null,
    structuralHints: [],
    confidence: "HIGH",
    uncertaintyReason: null,
    evidenceRef: `evidence://local/${nextId("ev")}`,
    subproblemCandidate: null,
    ...overrides,
  };
}

export function providerResult(
  providerId: string,
  modelId: string,
  regions: VisionRegion[],
  providerStatus: VisionProviderResult["providerStatus"] = "OK",
): VisionProviderResult {
  return { providerId, modelId, regions, providerStatus };
}

/** Fixed clock so pipeline/confirmation output is reproducible. */
export const fixedClock = (): string => "2026-10-02T00:00:00.000Z";
