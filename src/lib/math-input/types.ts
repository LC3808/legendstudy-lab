/**
 * MATH-3B — Mathematical Essay Vision / Input pipeline canonical types (LAB consumer).
 *
 * Provider-independent. No provider-specific (multimodal LLM / OCR) payload type is a canonical
 * Math domain fact — adapters normalize into the shapes below (MATH-3A §39). Original visual
 * evidence remains authoritative; structured extraction is derived (MATH-3A I1/I2). No raw image
 * binary lives in these types — only authorized evidence references (MATH-3A §18, I8).
 *
 * Exact APP physical identifiers are bound at the evaluation handoff from the deployed canonical
 * surface / generated types (MATH-2C-R); LAB never duplicates APP schema.
 */

/** Canonical content authority, never inferred from answer length (MATH-2A §2, MATH-3A §48). */
export type MathResponseFormat =
  | "SHORT_ANSWER"
  | "SHORT_REASONING"
  | "FULL_SOLUTION"
  | "PROOF";

export type MathInputModality = "IMAGE" | "PDF" | "TYPED";

/**
 * One piece of ordered attempt evidence. For IMAGE/PDF the bytes live behind an authorized
 * evidence reference (local/test abstraction in MATH-3B; Storage adapter later, R21). For TYPED
 * the content is carried in `typedText` and converges at the same normalized boundary (MATH-3A §33).
 */
export interface MathInputArtifact {
  artifactId: string;
  modality: MathInputModality;
  /** e.g. image/png, image/jpeg, application/pdf, text/plain. */
  mediaType: string;
  /** Declared byte size (0 for typed). */
  byteSize: number;
  /** 0-based ordering within the attempt; preserved across the pipeline (MATH-3A §5, §43). */
  pageIndex: number;
  /** Authorized/local handle to the original evidence — NEVER a public permanent URL (MATH-3A §28). */
  evidenceRef: string | null;
  /** Only for TYPED modality. */
  typedText?: string;
}

/* ------------------------------------------------------------------ confidence / uncertainty */

export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW" | "AMBIGUOUS" | "UNREADABLE";

export type UncertaintyReason =
  | "MODEL_LOW_CONFIDENCE"
  | "IMAGE_QUALITY"
  | "SYMBOL_AMBIGUITY"
  | "LAYOUT_AMBIGUITY"
  | "SUBPROBLEM_BINDING_AMBIGUITY";

/** Role of a region — criticality is role × response_format, not confidence alone (MATH-3A §20). */
export type RegionRole =
  | "FINAL_ANSWER"
  | "OPERATOR_SIGN"
  | "EXPONENT"
  | "INTEGRATION_BOUND"
  | "INEQUALITY_DIRECTION"
  | "SUBPROBLEM_MARKER"
  | "VARIABLE_IDENTITY"
  | "REASONING_TEXT"
  | "FORMULA"
  | "VISUAL"
  | "GRAPH"
  | "DIAGRAM"
  | "TABLE"
  | "OTHER";

export type RegionType =
  | "TEXT"
  | "MATH"
  | "VISUAL_REGION"
  | "GRAPH_REGION"
  | "DIAGRAM_REGION"
  | "TABLE_REGION";

/** Normalized (fractional 0..1) coordinates so identity survives image resize (MATH-3A §42). */
export interface NormalizedBoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * One normalized extraction region (MATH-3A §13). Formula representation is hybrid: a
 * LaTeX-compatible `normalizedMath` string + `rawText` + `structuralHints` + an evidence reference;
 * no CAS (MATH-3A §14). The original image remains authoritative.
 */
export interface VisionRegion {
  regionId: string;
  pageIndex: number;
  readingOrder: number;
  regionType: RegionType;
  role: RegionRole;
  boundingBox: NormalizedBoundingBox;
  rawText: string;
  normalizedMath: string | null;
  structuralHints: string[];
  confidence: ConfidenceBand;
  uncertaintyReason: UncertaintyReason | null;
  evidenceRef: string | null;
  subproblemCandidate: string | null;
}

/* ------------------------------------------------------------------ provider adapter boundary */

/**
 * Recognition context the extraction stage MAY receive (MATH-3A §17). It deliberately carries NO
 * official final answer and NO full official solution — that is evaluation/answer authority held by
 * MATH-4, withheld here to prevent extraction bias.
 */
export interface RecognitionContext {
  problemText?: string;
  subproblemLabels?: string[];
  expectedSymbols?: string[];
  expectedResponseFormat?: MathResponseFormat;
}

export interface VisionRequest {
  attemptId: string;
  responseFormat: MathResponseFormat;
  artifacts: MathInputArtifact[];
  recognitionContext?: RecognitionContext;
  /** Targeted fallback: when set, the adapter should re-read only these regions (MATH-3A §40). */
  targetRegionIds?: string[];
}

export type ProviderStatus = "OK" | "TIMEOUT" | "UNAVAILABLE" | "INVALID_OUTPUT";

/** Provider-neutral result. `providerId`/`modelId` are provenance only (MATH-3A §39). */
export interface VisionProviderResult {
  providerId: string;
  modelId: string;
  regions: VisionRegion[];
  providerStatus: ProviderStatus;
}

export interface VisionProviderAdapter {
  readonly providerId: string;
  readonly modelId: string;
  extract(request: VisionRequest): Promise<VisionProviderResult>;
}

/* ------------------------------------------------------------------ admission */

export type AdmissionStatus = "ADMITTED" | "REJECTED";

export type AdmissionRejectionReason =
  | "UNSUPPORTED_INPUT"
  | "INVALID_FILE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_PAGES"
  | "EMPTY_INPUT"
  | "DUPLICATE_PAGE_INDEX"
  | "PAGE_ORDER_INVALID"
  | "TYPED_EMPTY"
  | "TYPED_TOO_LONG";

export interface AdmissionResult {
  status: AdmissionStatus;
  reasons: AdmissionRejectionReason[];
  /** Admitted artifacts in canonical page order. */
  orderedArtifacts: MathInputArtifact[];
}

/* ------------------------------------------------------------------ merge / extraction run */

export type MergeDecision =
  | "PRIMARY_ACCEPTED"
  | "FALLBACK_ACCEPTED"
  | "STUDENT_CONFIRMATION_REQUIRED"
  | "HUMAN_REVIEW_REQUIRED"
  | "UNRESOLVED";

export interface RegionMergeProvenance {
  regionId: string;
  decision: MergeDecision;
  primaryProviderId: string;
  fallbackProviderId: string | null;
  /** Why the decision was taken — never "higher confidence wins" on a critical region (MATH-3A §41). */
  rationale: string;
}

export interface ExtractionProvenance {
  providerId: string;
  modelId: string;
  providerStatus: ProviderStatus;
  stage: "PRIMARY" | "FALLBACK" | "TYPED";
}

/** Append-only confirmation correction; retains the provider candidate as provenance (MATH-3A §44). */
export interface ConfirmedRegionCorrection {
  regionId: string;
  providerCandidateRawText: string;
  providerCandidateNormalizedMath: string | null;
  confirmedRawText: string;
  confirmedNormalizedMath: string | null;
  /** true = student confirmed the provider candidate as-is; false = student corrected it. */
  acceptedAsIs: boolean;
  confirmedAtIso: string;
}

export interface ExtractionRun {
  extractionRunId: string;
  /** Monotonic; re-extraction / confirmation creates a NEW version (MATH-3A I5, §22). */
  extractionVersion: number;
  attemptId: string;
  responseFormat: MathResponseFormat;
  regions: VisionRegion[];
  providerProvenance: ExtractionProvenance[];
  mergeProvenance: RegionMergeProvenance[];
  /** Set on a confirmed version; the predecessor run is retained (append-only). */
  corrections: ConfirmedRegionCorrection[];
  previousExtractionVersion: number | null;
  createdAtIso: string;
}

/* ------------------------------------------------------------------ readiness / failure */

export type PipelineFailureState =
  | "UNSUPPORTED_INPUT"
  | "INVALID_FILE"
  | "EXTRACTION_FAILED"
  | "CRITICAL_UNCERTAINTY"
  | "CONFIRMATION_REQUIRED"
  | "EVIDENCE_UNAVAILABLE";

export type ReadinessStatus =
  | "READY_FOR_EVALUATION"
  | "NEEDS_CONFIRMATION"
  | "NEEDS_REUPLOAD"
  | "INPUT_FAILED";

/**
 * MATH-4 handoff (MATH-3A §57, READY_FOR_MATH_EVALUATION_INPUT_V1). References, not binaries.
 * Provider-independent; consumable by MATH-4B without knowing any provider SDK.
 */
export interface ReadyForEvaluationInput {
  dtoVersion: "math-input-ready-v1";
  attemptId: string;
  responseFormat: MathResponseFormat;
  extractionVersion: number;
  pages: Array<{ pageIndex: number }>;
  regions: VisionRegion[];
  confirmationProvenance: ConfirmedRegionCorrection[];
  originalEvidenceRefs: string[];
  providerProvenance: ExtractionProvenance[];
  mergeProvenance: RegionMergeProvenance[];
  inputGateResult: "READY_FOR_EVALUATION";
}

export interface ReadinessResult {
  status: ReadinessStatus;
  failureStates: PipelineFailureState[];
  /** Regions still needing student confirmation (critical, unresolved). */
  confirmationRequired: VisionRegion[];
  readyInput: ReadyForEvaluationInput | null;
}

export interface ExtractionPipelineResult {
  admission: AdmissionResult;
  run: ExtractionRun | null;
  readiness: ReadinessResult;
}

/**
 * Vision/input processing carries NO separate Credit charge, and an input failure never consumes
 * evaluation entitlement (MATH-3A §27, MATH-6A §22-B). This constant documents and lets tests assert
 * that boundary; MATH-3B implements no billing.
 */
export const VISION_CREDIT_IMPACT = "NONE" as const;
