/**
 * MATH-4B — provider-independent evaluator adapter. The deterministic adapters here are test doubles
 * (no live model/CAS). A real evaluator (future controlled bake-off) wraps a model behind this same
 * interface; a provider-specific payload never becomes a canonical domain type.
 */

import type { MathEvaluationInput, MathEvaluatorAdapter, MathEvaluatorCandidate, MathEvalOutput } from "./types";

/** Returns a fixed candidate regardless of input (scenario-scripted). */
export function createScriptedEvaluator(
  providerId: string,
  modelId: string,
  output: MathEvalOutput,
): MathEvaluatorAdapter {
  return {
    providerId,
    modelId,
    evaluate: async () => ({ output }),
  };
}

/** Derives the candidate from the input (e.g. real adapters, or input-sensitive mocks). */
export function createDerivedEvaluator(
  providerId: string,
  modelId: string,
  derive: (input: MathEvaluationInput) => MathEvaluatorCandidate,
): MathEvaluatorAdapter {
  return {
    providerId,
    modelId,
    evaluate: async (input) => derive(input),
  };
}
