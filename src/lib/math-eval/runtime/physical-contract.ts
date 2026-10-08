/** APP MATH-2D wire adapter. Mock domain projections are not physical RPC responses. */
import type { MathEvaluationInput, MathResponseFormat, ReferenceProvenance } from "../types";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("INVALID_CLAIM");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value) throw Error("INVALID_CLAIM");
  return value;
}
function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw Error("INVALID_CLAIM");
  return value.map(object);
}
export function physicalClaimToInput(raw: unknown): MathEvaluationInput {
  const claim = object(raw), context = object(claim.context);
  const attempt = object(context.attempt), leaf = object(context.leaf), profile = object(context.profile);
  if (typeof profile.reasoning_required !== "boolean" ||
      !["SHORT_ANSWER", "SHORT_REASONING", "FULL_SOLUTION", "PROOF"].includes(String(leaf.response_format))) throw Error("INVALID_CLAIM");
  const extractionId = claim.selected_extraction_id === null ? null : text(claim.selected_extraction_id);
  // Preserve question, typed answer, extracted work, sources and profile pins for the adapter.
  // Never reconstruct these from a student result or silently omit the submitted work.
  object(context.problem);
  if (attempt.typed_answer !== null && typeof attempt.typed_answer !== "string") throw Error("INVALID_CLAIM");
  return {
    evaluationId: text(claim.evaluation_id), attemptId: text(attempt.attempt_id), leafId: text(leaf.id),
    responseFormat: leaf.response_format as MathResponseFormat, requiresReasoning: profile.reasoning_required,
    selectedExtractionId: extractionId,
    regionIds: rows(context.extraction).map(row => text(row.id)),
    criteria: rows(context.criteria).map(row => {
      if (row.official_points !== null && (typeof row.official_points !== "number" || !Number.isFinite(row.official_points))) throw Error("INVALID_CLAIM");
      return { criterion_id: text(row.id), max_points: row.official_points as number | null };
    }),
    authoritySolutions: rows(context.solutions).map(row => {
      const origin = row.origin;
      if (origin !== "OFFICIAL" && origin !== "VERIFIED_INTERNAL" && origin !== "AI_PROPOSED") throw Error("INVALID_CLAIM");
      return { id: text(row.id), provenance: (origin === "AI_PROPOSED" ? "AI_GENERATED_REFERENCE" : origin) as ReferenceProvenance };
    }),
    priorEvaluationId: attempt.prior_evaluation_id === null ? null : text(attempt.prior_evaluation_id),
    canonicalPackage: structuredClone({ ...context, selected_extraction_id: extractionId }),
  };
}

import type { MathEvalOutput } from "../types";
/** Explicit domain→physical conversion. SQL remains the final authority. */
export function physicalFinalize(output: MathEvalOutput, input: MathEvaluationInput): Record<string, unknown> {
  if (!input.canonicalPackage) throw Error("INVALID_CLAIM");
  const attempt = object(input.canonicalPackage.attempt), profile = object(input.canonicalPackage.profile);
  const required = profile.required_dimensions as string[];
  const dimensions = [...required, ...(profile.optional_dimensions as string[]).filter(key => key in output.rubric.dimensions)];
  const materiality = { MATERIAL: "MATERIAL_ERROR", MINOR: "MINOR_ERROR", PRESENTATION: "PRESENTATION_ISSUE", NON_ERROR_VARIATION: "NON_ERROR_VARIATION" };
  const deltaKinds = { core_corrected: "CORE_CORRECTED", root_error_removed: "ROOT_ERROR_REMOVED", new_independent_error: "NEW_INDEPENDENT_ERROR", answer_now_correct: "ANSWER_NOW_CORRECT", justification_improved: "JUSTIFICATION_IMPROVED", no_material_change: "NO_MATERIAL_CHANGE" };
  if (output.generated_solution && output.generated_solution.origin !== "AI_GENERATED_REFERENCE") throw Error("INVALID_OUTPUT");
  if (output.selected_extraction !== input.selectedExtractionId) throw Error("INVALID_OUTPUT");
  if (output.paths.some(path => path.verdict === "MATHEMATICAL_EQUIVALENCE_UNCERTAIN")) throw Error("INVALID_OUTPUT");
  if (output.steps.some(step => step.position < 1)) throw Error("INVALID_OUTPUT");
  // MATH-2C does not store numeric awarded points. Reject instead of silently discarding.
  if (output.criteria.some(criterion => criterion.awarded_points != null)) throw Error("INVALID_OUTPUT");
  return {
    contract_version: "math-eval-v1", extraction_id: input.selectedExtractionId,
    steps: output.steps, edges: output.edges,
    errors: output.errors.map(error => ({ ...error, materiality: materiality[error.materiality] })),
    causes: output.causes, core: output.core,
    hints: output.hints.map(hint => ({ ...hint, leakage_class: hint.level === 0 ? "CORE_ONLY" : hint.leakage_class })),
    references: output.references, paths: output.paths,
    criteria: output.criteria.map(criterion => ({ criterion_id: criterion.criterion_id, verdict: criterion.satisfied.toLowerCase(), explanation: criterion.reason })),
    rubric: Object.fromEntries(dimensions.map(key => {
      const value = output.rubric.dimensions[key]; if (!value) throw Error("INVALID_OUTPUT"); return [key, value];
    })),
    overall: { status: output.overall.diagnostic, answer_status: output.overall.answer, coverage: output.overall.coverage,
      explanation: output.overall.diagnostic, review_status: output.overall.status === "NEEDS_HUMAN_REVIEW" ? "HUMAN_REVIEW_REQUIRED" : "NOT_REQUIRED" },
    provenance: { provider: output.provenance.model_provider, model: output.provenance.model_name,
      model_version: output.provenance.model_name, prompt_version: output.provenance.prompt_version },
    progression: output.progression === null ? null : {
      prior_evaluation_id: output.progression.prior_evaluation_id, target_step_id: attempt.target_step_id ?? null,
      downstream: attempt.kind === "STEP_RETRY" ? "NOT_REASSESSED" : null, summary: "재작성 답안 비교",
      delta: Object.entries(deltaKinds).filter(([key]) => output.progression?.[key as keyof typeof deltaKinds] === true)
        .map(([, kind]) => ({ kind, explanation: "재작성 답안에서 확인한 변화" })),
    },
    generated_solution: output.generated_solution ? { body: output.generated_solution.body, origin: "AI_GENERATED" } : null,
  };
}
