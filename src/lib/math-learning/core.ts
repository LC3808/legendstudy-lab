/**
 * MATH-5B — CORE presentation over canonical MATH-4 facts. Selection/ordering only; MATH-5 never
 * turns a propagated consequence into an independent root, invents an error, or changes correctness/
 * official score (MATH-5A §5). CORE may be empty.
 */

import type { MathEvalOutput, ReferenceProvenance } from "../math-eval/types";
import type { CorePresentation, CoreView, PropagatedGroup, ReferenceProvenanceLabel } from "./types";

function toPresentation(core: MathEvalOutput["core"][number]): CorePresentation {
  return {
    coreId: core.id,
    errorId: core.error_id,
    stepId: core.step_id,
    title: core.title,
    diagnosis: core.diagnosis,
    why: core.why,
    nextAction: core.next_action,
  };
}

/**
 * Build the CORE view: primary = lowest-position canonical CORE, secondary = the rest (no numeric
 * student-facing score). Propagated consequences are grouped under their root, never listed as
 * independent weaknesses.
 */
export function buildCoreView(output: MathEvalOutput): CoreView {
  const ordered = [...output.core].sort((a, b) => a.position - b.position);
  const [primary, ...secondary] = ordered;
  return {
    primary: primary ? toPresentation(primary) : null,
    secondary: secondary.map(toPresentation),
    propagatedSummary: groupPropagated(output),
  };
}

/** Group PROPAGATED errors under their ROOT via the causal edges (MATH-5A §7, §8). */
export function groupPropagated(output: MathEvalOutput): PropagatedGroup[] {
  const errorById = new Map(output.errors.map((e) => [e.id, e]));
  const groups = new Map<string, PropagatedGroup>();
  for (const cause of output.causes) {
    const root = errorById.get(cause.root);
    const consequence = errorById.get(cause.consequence);
    if (!root || !consequence) continue;
    const group = groups.get(root.id) ?? { rootErrorId: root.id, rootStepId: root.step_id, consequenceErrorIds: [] };
    if (!group.consequenceErrorIds.includes(consequence.id)) group.consequenceErrorIds.push(consequence.id);
    groups.set(root.id, group);
  }
  return [...groups.values()];
}

const PROVENANCE_LABEL: Record<ReferenceProvenance, string> = {
  OFFICIAL: "대학 공식 해설",
  VERIFIED_INTERNAL: "레전드스터디 검증 풀이",
  AI_GENERATED_REFERENCE: "AI 참고 풀이",
};

/** Canonical provenance drives the label; AI content is never labeled official (MATH-5A §26). */
export function referenceLabel(provenance: ReferenceProvenance): ReferenceProvenanceLabel {
  return { provenance, label: PROVENANCE_LABEL[provenance] };
}
