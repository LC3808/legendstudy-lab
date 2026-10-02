/**
 * MATH-6B — re-solve preparation over the server-authoritative LearningState. Validates the resolve
 * kind against backend-allowed kinds (fail closed; PARTIAL_RESOLVE rejected), derives lineage from the
 * state (never client-authored), and builds the exact create_resolve_attempt payload. MATH-6 never
 * recomputes correctness; input readiness continues through the existing MATH-3 pipeline.
 */

import type { CreateResolveAttemptPayload, ResolveInputKind, ResolveKind, LearningState } from "./runtime/contract";

export type ResolvePrepCode =
  | "UNKNOWN_RESOLVE_KIND"
  | "RESOLVE_KIND_NOT_ALLOWED"
  | "STEP_RETRY_REQUIRES_TARGET"
  | "TARGET_ONLY_FOR_STEP_RETRY"
  | "SHORT_ANSWER_RESOLVE_FORMAT_MISMATCH"
  | "NO_VALID_EVALUATION";

export class ResolvePrepError extends Error {
  readonly code: ResolvePrepCode;
  constructor(code: ResolvePrepCode, message: string) {
    super(message);
    this.name = "ResolvePrepError";
    this.code = code;
  }
}

const KNOWN_KINDS: ReadonlySet<string> = new Set<ResolveKind>(["STEP_RETRY", "FULL_RESOLVE", "SHORT_ANSWER_RESOLVE"]);

export interface PrepareResolveOptions {
  kind: ResolveKind;
  inputKind: ResolveInputKind;
  clientSubmissionId: string;
  typedAnswer?: string;
  targetStepId?: string | null;
}

/**
 * Validate + build a create_resolve_attempt payload from the server state. Lineage
 * (predecessor/prior evaluation/leaf) is taken from the state, never from the client.
 */
export function prepareResolveAttempt(state: LearningState, options: PrepareResolveOptions): CreateResolveAttemptPayload {
  // Unknown kind (e.g. PARTIAL_RESOLVE) fails closed.
  if (!KNOWN_KINDS.has(options.kind)) {
    throw new ResolvePrepError("UNKNOWN_RESOLVE_KIND", `unknown resolve kind ${options.kind}`);
  }
  if (!state.valid_evaluation_available) {
    throw new ResolvePrepError("NO_VALID_EVALUATION", "no valid evaluation to resolve from");
  }
  // Only backend-offered kinds are allowed.
  if (!state.resolve_kinds.includes(options.kind)) {
    throw new ResolvePrepError("RESOLVE_KIND_NOT_ALLOWED", `resolve kind ${options.kind} not offered by the server`);
  }
  if (options.kind === "STEP_RETRY") {
    if (!options.targetStepId) throw new ResolvePrepError("STEP_RETRY_REQUIRES_TARGET", "STEP_RETRY requires target_step_id");
  } else if (options.targetStepId) {
    throw new ResolvePrepError("TARGET_ONLY_FOR_STEP_RETRY", "target_step_id only valid for STEP_RETRY");
  }
  if (options.kind === "SHORT_ANSWER_RESOLVE" && state.response_format !== "SHORT_ANSWER") {
    throw new ResolvePrepError("SHORT_ANSWER_RESOLVE_FORMAT_MISMATCH", "SHORT_ANSWER_RESOLVE requires a SHORT_ANSWER leaf");
  }

  const payload: CreateResolveAttemptPayload = {
    client_submission_id: options.clientSubmissionId,
    leaf_id: state.leaf_id,
    kind: options.kind,
    predecessor_id: state.attempt_id,
    prior_evaluation_id: state.evaluation_id,
    input_kind: options.inputKind,
  };
  if (options.typedAnswer !== undefined) payload.typed_answer = options.typedAnswer;
  if (options.kind === "STEP_RETRY") payload.target_step_id = options.targetStepId ?? null;
  return payload;
}

/** Submitted scope implied by the resolve kind (presentation only; server is authority). */
export function submittedScopeForKind(kind: ResolveKind): "TARGET_STEP" | "WHOLE_LEAF" {
  return kind === "STEP_RETRY" ? "TARGET_STEP" : "WHOLE_LEAF";
}
