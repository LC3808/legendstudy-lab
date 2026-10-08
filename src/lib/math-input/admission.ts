/**
 * MATH-3B — bounded input admission (MATH-3A §4, §53). Limits are IMPLEMENTATION_CALIBRATION:
 * confirmed against real platform/provider constraints in MATH-3C; server validation stays
 * authoritative at Production activation. Admission never judges mathematics.
 */

import type {
  AdmissionRejectionReason,
  AdmissionResult,
  MathInputArtifact,
} from "./types";

/** IMPLEMENTATION_CALIBRATION — not final Production limits. */
export const MATH_INPUT_LIMITS = {
  maxPages: 20,
  maxFileBytes: 20 * 1024 * 1024,
  maxTypedChars: 20_000,
  supportedImageTypes: ["image/png", "image/jpeg", "image/webp", "image/heic"],
  supportedPdfTypes: ["application/pdf"],
  supportedTypedTypes: ["text/plain"],
} as const;

function isSupportedMedia(artifact: MathInputArtifact): boolean {
  switch (artifact.modality) {
    case "IMAGE":
      return (MATH_INPUT_LIMITS.supportedImageTypes as readonly string[]).includes(artifact.mediaType);
    case "PDF":
      return (MATH_INPUT_LIMITS.supportedPdfTypes as readonly string[]).includes(artifact.mediaType);
    case "TYPED":
      return (MATH_INPUT_LIMITS.supportedTypedTypes as readonly string[]).includes(artifact.mediaType);
    default:
      return false;
  }
}

/**
 * Validate admission for an attempt's artifacts. Returns ADMITTED with page-ordered artifacts, or
 * REJECTED with a bounded set of reasons. No artifact bytes are read here (references only).
 */
export function admitMathInput(artifacts: MathInputArtifact[]): AdmissionResult {
  const reasons = new Set<AdmissionRejectionReason>();

  if (artifacts.length === 0) {
    reasons.add("EMPTY_INPUT");
    return { status: "REJECTED", reasons: [...reasons], orderedArtifacts: [] };
  }

  if (artifacts.length > MATH_INPUT_LIMITS.maxPages) {
    reasons.add("TOO_MANY_PAGES");
  }

  const seenPageIndexes = new Set<number>();
  for (const artifact of artifacts) {
    if (!isSupportedMedia(artifact)) {
      reasons.add("UNSUPPORTED_INPUT");
    }

    if (artifact.modality === "TYPED") {
      const text = (artifact.typedText ?? "").trim();
      if (text.length === 0) reasons.add("TYPED_EMPTY");
      else if (text.length > MATH_INPUT_LIMITS.maxTypedChars) reasons.add("TYPED_TOO_LONG");
    } else {
      // Image/PDF must reference evidence and declare a plausible size.
      if (!artifact.evidenceRef) reasons.add("INVALID_FILE");
      if (artifact.byteSize <= 0) reasons.add("INVALID_FILE");
      if (artifact.byteSize > MATH_INPUT_LIMITS.maxFileBytes) reasons.add("FILE_TOO_LARGE");
    }

    if (!Number.isInteger(artifact.pageIndex) || artifact.pageIndex < 0) {
      reasons.add("PAGE_ORDER_INVALID");
    } else if (seenPageIndexes.has(artifact.pageIndex)) {
      reasons.add("DUPLICATE_PAGE_INDEX");
    } else {
      seenPageIndexes.add(artifact.pageIndex);
    }
  }

  if (reasons.size > 0) {
    return { status: "REJECTED", reasons: [...reasons], orderedArtifacts: [] };
  }

  const orderedArtifacts = [...artifacts].sort((a, b) => a.pageIndex - b.pageIndex);
  return { status: "ADMITTED", reasons: [], orderedArtifacts };
}
