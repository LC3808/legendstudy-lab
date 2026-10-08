/**
 * MATH-4B — canonical LAB-side validation of a math-eval-v1 candidate before finalize (fail closed;
 * no partial publish, MATH-4A §40/§41). Mirrors the MATH-2C server invariants (acyclic DAG, every
 * PROPAGATED error has a cause, pinned references/criteria, step-region grounding) plus MATH-4
 * grounding, root/propagated, rubric-version, and the SHORT_ANSWER brevity firewall.
 */

import {
  MATH_RUBRIC_VERSION,
  type MathEvalOutput,
  type MathEvaluationInput,
  type RootErrorCategory,
} from "./types";

export type ValidationCode =
  | "UNKNOWN_RUBRIC_VERSION"
  | "DUPLICATE_STEP_ID"
  | "UNGROUNDED_STEP_REGION"
  | "SELF_EDGE"
  | "DUPLICATE_EDGE"
  | "MISSING_EDGE_ENDPOINT"
  | "DAG_CYCLE"
  | "ERROR_STEP_BINDING"
  | "UNKNOWN_ERROR_CATEGORY"
  | "NON_MATERIAL_ROOT"
  | "CAUSE_BINDING"
  | "PROPAGATED_WITHOUT_CAUSE"
  | "SELF_CAUSE"
  | "CORE_BINDING"
  | "HINT_BINDING"
  | "UNPINNED_REFERENCE"
  | "MISSING_CRITERION"
  | "UNPINNED_CRITERION"
  | "INVENTED_POINTS"
  | "SHORT_ANSWER_INVENTED_ERROR"
  | "SHORT_ANSWER_RUBRIC_NOT_NA";

export interface ValidationIssue {
  code: ValidationCode;
  message: string;
}
export interface MathEvaluationValidation {
  ok: boolean;
  issues: ValidationIssue[];
}

const CATEGORIES: ReadonlySet<RootErrorCategory> = new Set<RootErrorCategory>([
  "CONDITION_MISREAD",
  "CONCEPT_SELECTION",
  "STRATEGY",
  "LOGICAL_GAP",
  "CALCULATION",
  "SIGN",
  "ALGEBRAIC_TRANSFORMATION",
  "CASE_OMISSION",
  "DOMAIN_RANGE",
  "THEOREM_MISUSE",
  "GRAPH_INTERPRETATION",
  "JUSTIFICATION",
  "CONCLUSION",
  "OTHER",
]);

function hasCycle(stepIds: Set<string>, edges: { from: string; to: string }[]): boolean {
  const adj = new Map<string, string[]>();
  for (const id of stepIds) adj.set(id, []);
  for (const e of edges) adj.get(e.from)?.push(e.to);
  const state = new Map<string, number>(); // 0 unvisited, 1 in-stack, 2 done
  const visit = (node: string): boolean => {
    state.set(node, 1);
    for (const next of adj.get(node) ?? []) {
      const s = state.get(next) ?? 0;
      if (s === 1) return true;
      if (s === 0 && visit(next)) return true;
    }
    state.set(node, 2);
    return false;
  };
  for (const id of stepIds) {
    if ((state.get(id) ?? 0) === 0 && visit(id)) return true;
  }
  return false;
}

export function validateMathEval(
  output: MathEvalOutput,
  input: MathEvaluationInput,
): MathEvaluationValidation {
  const issues: ValidationIssue[] = [];
  const add = (code: ValidationCode, message: string) => issues.push({ code, message });

  if (output.rubric.rubric_version !== MATH_RUBRIC_VERSION) {
    add("UNKNOWN_RUBRIC_VERSION", `unsupported rubric_version ${output.rubric.rubric_version}`);
  }

  // Steps + region grounding.
  const stepIds = new Set<string>();
  const regionPins = new Set(input.regionIds);
  for (const step of output.steps) {
    if (stepIds.has(step.id)) add("DUPLICATE_STEP_ID", `duplicate step ${step.id}`);
    stepIds.add(step.id);
    for (const regionId of step.regions) {
      if (!regionPins.has(regionId)) add("UNGROUNDED_STEP_REGION", `step ${step.id} cites unpinned region ${regionId}`);
    }
  }

  // Edges (logical DAG) — distinct from causal propagation.
  const edgeKeys = new Set<string>();
  for (const edge of output.edges) {
    if (edge.from === edge.to) add("SELF_EDGE", `self edge ${edge.from}`);
    const key = `${edge.from}->${edge.to}`;
    if (edgeKeys.has(key)) add("DUPLICATE_EDGE", `duplicate edge ${key}`);
    edgeKeys.add(key);
    if (!stepIds.has(edge.from) || !stepIds.has(edge.to)) add("MISSING_EDGE_ENDPOINT", `edge endpoint missing ${key}`);
  }
  if (hasCycle(stepIds, output.edges)) add("DAG_CYCLE", "logical dependency graph has a cycle");

  // Errors.
  const errorById = new Map(output.errors.map((e) => [e.id, e]));
  for (const error of output.errors) {
    if (!stepIds.has(error.step_id)) add("ERROR_STEP_BINDING", `error ${error.id} not bound to a student step`);
    if (!CATEGORIES.has(error.category)) add("UNKNOWN_ERROR_CATEGORY", `error ${error.id} bad category`);
    if (error.classification === "ROOT" && error.materiality !== "MATERIAL") {
      add("NON_MATERIAL_ROOT", `root error ${error.id} is not MATERIAL`);
    }
  }

  // Causes (propagation) — separate from edges.
  const consequenceCovered = new Set<string>();
  for (const cause of output.causes) {
    if (cause.root === cause.consequence) add("SELF_CAUSE", `self cause ${cause.root}`);
    const root = errorById.get(cause.root);
    const consequence = errorById.get(cause.consequence);
    if (!root || root.classification !== "ROOT") add("CAUSE_BINDING", `cause root ${cause.root} is not a ROOT error`);
    if (!consequence || consequence.classification !== "PROPAGATED") add("CAUSE_BINDING", `cause consequence ${cause.consequence} is not a PROPAGATED error`);
    if (consequence) consequenceCovered.add(consequence.id);
  }
  for (const error of output.errors) {
    if (error.classification === "PROPAGATED" && !consequenceCovered.has(error.id)) {
      add("PROPAGATED_WITHOUT_CAUSE", `propagated error ${error.id} has no causal ancestor`);
    }
  }

  // CORE (may be empty) + hints.
  const coreIds = new Set<string>();
  for (const core of output.core) {
    coreIds.add(core.id);
    if (core.error_id !== null && !errorById.has(core.error_id)) add("CORE_BINDING", `core ${core.id} bad error_id`);
    if (core.step_id !== null && !stepIds.has(core.step_id)) add("CORE_BINDING", `core ${core.id} bad step_id`);
  }
  for (const hint of output.hints) {
    if (!coreIds.has(hint.core_id)) add("HINT_BINDING", `hint ${hint.id} bad core_id`);
  }

  // References must be pinned authority solutions.
  const pinnedSolutionIds = new Set(input.authoritySolutions.map((s) => s.id));
  for (const ref of output.references) {
    if (!pinnedSolutionIds.has(ref)) add("UNPINNED_REFERENCE", `reference ${ref} not pinned`);
  }

  // Criteria coverage (every pinned criterion once; no invented criterion; no invented points).
  const pinnedCriteria = new Map(input.criteria.map((c) => [c.criterion_id, c]));
  const seenCriteria = new Set<string>();
  for (const result of output.criteria) {
    const pin = pinnedCriteria.get(result.criterion_id);
    if (!pin) add("UNPINNED_CRITERION", `criterion ${result.criterion_id} not pinned`);
    seenCriteria.add(result.criterion_id);
    if (result.awarded_points != null && (!pin || pin.max_points === null)) {
      add("INVENTED_POINTS", `criterion ${result.criterion_id} awards points with no published maximum`);
    }
  }
  for (const pin of input.criteria) {
    if (!seenCriteria.has(pin.criterion_id)) add("MISSING_CRITERION", `pinned criterion ${pin.criterion_id} missing`);
  }

  // SHORT_ANSWER brevity firewall (§5, E03): no invented reasoning error when reasoning isn't required.
  if (input.responseFormat === "SHORT_ANSWER" && !input.requiresReasoning) {
    if (output.errors.some((e) => e.classification === "ROOT")) {
      add("SHORT_ANSWER_INVENTED_ERROR", "SHORT_ANSWER without required reasoning cannot carry a root error");
    }
    for (const dim of ["justification_completeness", "mathematical_writing"]) {
      const verdict = output.rubric.dimensions[dim];
      if (verdict !== undefined && verdict !== "NOT_APPLICABLE") {
        add("SHORT_ANSWER_RUBRIC_NOT_NA", `SHORT_ANSWER dimension ${dim} must be NOT_APPLICABLE`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
