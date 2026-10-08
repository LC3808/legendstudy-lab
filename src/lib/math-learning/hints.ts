/**
 * MATH-5B — hint leakage classification, fail-closed validation, and progressive gating.
 *
 * Leakage is multi-signal (declared class vs level/format policy + known-answer containment), not sole
 * string matching (MATH-5A §55/§56, brief §17). L0 = what to fix; L1 = SAFE_DIRECTION; L2 =
 * CONCEPT_REVEAL. SHORT_ANSWER L1/L2 never reveal the required answer; no verbatim full solution/proof.
 */

import { MATH_RUBRIC_VERSION } from "../math-eval/types";
import type { MathEvalHint, MathEvalOutput } from "../math-eval/types";
import type { HintLevel, LeakagePolicyContext, LeakageResult } from "./types";

type LeakageClass = MathEvalHint["leakage_class"];
const CLASS_RANK: Record<LeakageClass, number> = {
  SAFE_DIRECTION: 1,
  CONCEPT_REVEAL: 2,
  SOLUTION_REVEAL: 3,
};

/** Maximum leakage class allowed at a level: L0/L1 → SAFE_DIRECTION, L2 → CONCEPT_REVEAL. */
function maxAllowedClass(level: HintLevel): LeakageClass {
  return level === 2 ? "CONCEPT_REVEAL" : "SAFE_DIRECTION";
}

const norm = (value: string): string => value.replace(/\s+/g, "").toLowerCase();

/** Classify a hint's leakage from its declared class, level/format policy, and answer containment. */
export function classifyLeakage(hint: MathEvalHint, ctx: LeakagePolicyContext): LeakageResult {
  // A hint is never allowed to be a full solution reveal.
  if (hint.leakage_class === "SOLUTION_REVEAL") return "FORBIDDEN_LEAK";
  // Declared class must not exceed the level's ceiling.
  if (CLASS_RANK[hint.leakage_class] > CLASS_RANK[maxAllowedClass(hint.level)]) return "FORBIDDEN_LEAK";
  // SHORT_ANSWER: a hint must never contain the required final answer.
  if (ctx.responseFormat === "SHORT_ANSWER" && ctx.finalAnswer) {
    const answer = norm(ctx.finalAnswer);
    if (answer.length > 0 && norm(hint.body).includes(answer)) return "FORBIDDEN_LEAK";
  }
  // A CONCEPT_REVEAL at L2 is deliberate but noted as a potential concept disclosure.
  if (hint.leakage_class === "CONCEPT_REVEAL") return "POTENTIAL_LEAK";
  return "SAFE";
}

export type HintValidationCode =
  | "UNKNOWN_HINT_VERSION"
  | "UNKNOWN_LEVEL"
  | "UNBOUND_HINT"
  | "UNGROUNDED_HINT"
  | "EMPTY_BODY"
  | "FORBIDDEN_LEAK";

export interface HintValidation {
  ok: boolean;
  leakage: LeakageResult;
  issues: HintValidationCode[];
}

/**
 * Fail-closed hint validation before reveal. Binds the hint to a canonical CORE (and through it to a
 * grounded error/step), checks level/body/version, and rejects any FORBIDDEN leakage.
 */
export function validateHint(
  hint: MathEvalHint,
  output: MathEvalOutput,
  ctx: LeakagePolicyContext,
): HintValidation {
  const issues: HintValidationCode[] = [];

  if (output.rubric.rubric_version !== MATH_RUBRIC_VERSION) issues.push("UNKNOWN_HINT_VERSION");
  if (![0, 1, 2].includes(hint.level)) issues.push("UNKNOWN_LEVEL");
  if (hint.body.trim().length === 0) issues.push("EMPTY_BODY");

  const core = output.core.find((c) => c.id === hint.core_id);
  if (!core) {
    issues.push("UNBOUND_HINT");
  } else {
    const groundedToError = core.error_id !== null && output.errors.some((e) => e.id === core.error_id);
    const groundedToStep = core.step_id !== null && output.steps.some((s) => s.id === core.step_id);
    if (!groundedToError && !groundedToStep) issues.push("UNGROUNDED_HINT");
  }

  const leakage = classifyLeakage(hint, ctx);
  if (leakage === "FORBIDDEN_LEAK") issues.push("FORBIDDEN_LEAK");

  return { ok: issues.length === 0, leakage, issues };
}

/* --------------------------------------------------- progressive gating */

/** L0 is delivered with the evaluation; L1 on request; L2 requires L1 exposed first (MATH-5A §23). */
export function canReveal(level: HintLevel, exposedLevels: ReadonlySet<HintLevel>): boolean {
  if (level === 0) return true;
  if (level === 1) return true;
  return exposedLevels.has(1);
}

export function nextRevealableLevel(exposedLevels: ReadonlySet<HintLevel>): HintLevel | null {
  if (!exposedLevels.has(1)) return 1;
  if (!exposedLevels.has(2)) return 2;
  return null;
}
