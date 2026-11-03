import type { MathEvaluationInput } from "./types";

/** Lossless labels for the existing immutable worker claim, not a new answer store. */
export function submittedMathAnswer(input: MathEvaluationInput) {
  const context = input.canonicalPackage;
  if (!context) return null; // Historical domain-only fixtures have no physical claim.
  const attempt = context.attempt as Record<string, unknown>;
  const extraction = context.extraction as Record<string, unknown>[];
  return {
    source: "STUDENT_SUBMISSION" as const,
    typed_text: typeof attempt.typed_answer === "string" ? attempt.typed_answer : null,
    confirmed_extraction_id: input.selectedExtractionId,
    // Only the server-selected confirmed extraction belongs to the submission.
    confirmed_regions: input.selectedExtractionId === null ? [] : extraction.map(region => ({
      id: String(region.id),
      reading_order: region.reading_order,
      page: region.page,
      raw_text: typeof region.raw_text === "string" ? region.raw_text : "",
      normalized_math: typeof region.normalized_math === "string" ? region.normalized_math : "",
    })),
  };
}

export function hasSubmittedMathContent(input: MathEvaluationInput): boolean {
  const answer = submittedMathAnswer(input);
  return !!answer && (!!answer.typed_text?.trim() || answer.confirmed_regions.some(
    region => !!region.raw_text.trim() || !!region.normalized_math.trim(),
  ));
}
