/**
 * MATH-3B-R — LAB consumer binding to the MATH-2D runtime RPC surface.
 *
 * Provenance (authority; not duplicated as SQL):
 *   APP commit:       17e528b6b58b4c910c3f16f73be5fb1638a8bbdc
 *   runtime migration: supabase/migrations/20261002000200_math_runtime_surface.sql
 *   runtime SHA-256:   b40bf7224a84658308ff1640b639acb857e379998211131d97a688a9711fe049
 *   runtime contract:  supabase/verification/math_essay/runtime/README.md
 *   (MATH-2D local/isolated only; Production NOT_APPLIED. No generated TS SDK exists in APP.)
 *
 * Transport is PostgREST `rpc(fn, { p_request })`. Envelope is EXACTLY {dto_version, action, payload};
 * response is EXACTLY {dto_version, action, result}. Unknown version/action/keys reject server-side;
 * the consumer also fails closed on an unexpected response dto_version. No owner/reviewer/account/
 * price/profile authority field is ever sent — the server derives identity from the JWT (auth.uid()).
 */

export const MATH_INPUT_DTO = "math-input-v1" as const;
export const MATH_EXTRACTION_DTO = "math-extraction-v1" as const;

export type MathRpcFunction = "math_input" | "math_extraction" | "math_evaluation";

export interface RuntimeEnvelope<P = Record<string, unknown>> {
  dto_version: string;
  action: string;
  payload: P;
}

export interface RuntimeResponse<R = unknown> {
  dto_version: string;
  action: string;
  result: R;
}

/* --------------------------------------------------- math_input (student, math-input-v1) */

export type MathInputAction =
  | "create_attempt"
  | "register_evidence"
  | "confirm_extraction"
  | "read_input";

export type AttemptKind = "INITIAL" | "SHORT_ANSWER_RESOLVE" | "FULL_RESOLVE" | "STEP_RETRY";
export type AttemptInputKind = "TYPED" | "EVIDENCE" | "MIXED";

export interface CreateAttemptPayload {
  client_submission_id: string;
  leaf_id: string;
  kind: AttemptKind;
  input_kind: AttemptInputKind;
  typed_answer?: string;
  predecessor_id?: string;
  prior_evaluation_id?: string;
  target_step_id?: string;
}
export interface CreateAttemptResult {
  attempt_id: string;
}

export interface EvidenceMetadata {
  position: number;
  media_type: "image/png" | "image/jpeg" | "image/webp" | "application/pdf";
  byte_size: number;
  content_sha256?: string;
  width?: number;
  height?: number;
  orientation?: 0 | 90 | 180 | 270;
}
export interface RegisterEvidencePayload {
  attempt_id: string;
  metadata: EvidenceMetadata;
}
export interface RegisterEvidenceResult {
  artifact_id: string;
  storage_state: string;
  upload_available: boolean;
}

/** Each region is EXACTLY these keys (strings ≤10000). */
export interface ConfirmRegion {
  region_id: string;
  raw_text: string;
  normalized_math: string;
}
export interface ConfirmExtractionPayload {
  attempt_id: string;
  run_id: string;
  regions: ConfirmRegion[];
}
export interface ConfirmExtractionResult {
  confirmed_run_id: string;
}

export type ServerInputState =
  | "INPUT_REQUIRED"
  | "EXTRACTION_PROCESSING"
  | "CONFIRMATION_REQUIRED"
  | "READY_FOR_EVALUATION"
  | "INPUT_FROZEN";

export interface ReadInputPayload {
  attempt_id: string;
}
export interface ReadInputResult {
  attempt: Record<string, unknown>;
  input_state: ServerInputState;
  can_request_evaluation: boolean;
  selected_extraction_id: string | null;
  candidate: Record<string, unknown> | null;
  artifacts: unknown[];
  candidate_regions: WireCandidateRegion[];
  confirmed_regions: WireCandidateRegion[];
}

/* --------------------------------------------------- math_extraction (WORKER ONLY, math-extraction-v1) */

export type MathExtractionAction = "claim" | "finalize" | "fail";

export interface ClaimPayload {
  attempt_id: string;
}
export interface ClaimResult {
  run_id: string;
  lease_token: string;
  lease_until: string;
  artifacts: WireClaimArtifact[];
  /** Server-owned bucket/object_key for a future trusted Storage broker — NEVER a browser DTO. */
  evidence: unknown;
}

export interface WireClaimArtifact {
  artifact_id: string;
  position: number;
  media_type: string;
}

/** Worker finalize output region (server assigns the persisted region_id afterwards). */
export interface WireExtractionRegion {
  artifact_id: string;
  page: number;
  reading_order: number;
  raw_text: string;
  normalized_math: string;
  confidence?: number | null;
  uncertain: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** read_input candidate/confirmed region — carries the server-assigned region_id for confirmation. */
export interface WireCandidateRegion extends WireExtractionRegion {
  region_id: string;
}

export interface FinalizeOutput {
  regions: WireExtractionRegion[];
  provider: string;
  model: string;
  model_version: string;
}
export interface FinalizePayload {
  run_id: string;
  lease_token: string;
  output: FinalizeOutput;
}
export interface FinalizeResult {
  run_id: string;
}

export type ExtractionErrorCode = "INPUT_FAILED" | "TIMEOUT" | "INVALID_OUTPUT";
export interface FailPayload {
  run_id: string;
  lease_token: string;
  error_code: ExtractionErrorCode;
}
export interface FailResult {
  failed: boolean;
}

/** READY is a server-derived projection, never a client-writable state. */
export function isServerReady(state: ServerInputState): boolean {
  return state === "READY_FOR_EVALUATION";
}
