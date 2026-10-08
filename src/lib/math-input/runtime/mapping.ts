/**
 * MATH-3B-R — mapping between MATH-3B canonical domain and MATH-2D wire shapes, so the domain
 * pipeline stays persistence-independent. Canonical VisionRegion ↔ wire extraction region;
 * wire candidate regions → canonical for client-side UX prediction; server input_state is authority.
 */

import { isUncertain } from "../confidence";
import type { VisionRegion } from "../types";
import type { ConfirmRegion, WireCandidateRegion, WireExtractionRegion } from "./contract";

/** Canonical extraction region → MATH-2D worker finalize output region. */
export function toWireExtractionRegion(region: VisionRegion): WireExtractionRegion {
  const { x0, y0, x1, y1 } = region.boundingBox;
  return {
    artifact_id: region.evidenceRef ?? region.regionId,
    page: region.pageIndex,
    reading_order: region.readingOrder,
    raw_text: region.rawText,
    normalized_math: region.normalizedMath ?? "",
    uncertain: isUncertain(region.confidence),
    x: x0,
    y: y0,
    width: Math.max(0, x1 - x0),
    height: Math.max(0, y1 - y0),
  };
}

/** MATH-2D candidate/confirmed region → canonical VisionRegion for client-side UX prediction only. */
export function fromWireCandidateRegion(wire: WireCandidateRegion): VisionRegion {
  return {
    regionId: wire.region_id,
    pageIndex: wire.page,
    readingOrder: wire.reading_order,
    regionType: "MATH",
    role: "OTHER",
    boundingBox: { x0: wire.x, y0: wire.y, x1: wire.x + wire.width, y1: wire.y + wire.height },
    rawText: wire.raw_text,
    normalizedMath: wire.normalized_math === "" ? null : wire.normalized_math,
    structuralHints: [],
    confidence: wire.uncertain ? "AMBIGUOUS" : "HIGH",
    uncertaintyReason: wire.uncertain ? "MODEL_LOW_CONFIDENCE" : null,
    evidenceRef: wire.artifact_id,
    subproblemCandidate: null,
  };
}

/** Build the confirm_extraction region payload (student resolves each uncertain candidate region). */
export function toConfirmRegion(region: WireCandidateRegion, correctedNormalizedMath?: string): ConfirmRegion {
  return {
    region_id: region.region_id,
    raw_text: region.raw_text,
    normalized_math: correctedNormalizedMath ?? region.normalized_math,
  };
}
