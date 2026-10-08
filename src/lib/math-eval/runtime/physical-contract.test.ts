import { describe, expect, it } from "vitest";
import { physicalClaimToInput } from "./physical-contract";
const claim = () => ({ evaluation_id: "evaluation", selected_extraction_id: null, context: {
  attempt: { attempt_id: "attempt", typed_answer: "2", prior_evaluation_id: null },
  leaf: { id: "leaf", response_format: "SHORT_ANSWER" }, problem: { statement: "1+1" },
  profile: { reasoning_required: false }, extraction: [],
  criteria: [{ id: "criterion", official_points: null }], solutions: [{ id: "solution", origin: "OFFICIAL", body: "2" }],
}});
describe("APP physical claim boundary", () => {
  it("keeps typed input with null extraction and canonical question/answer", () => {
    const wire = claim(), input = physicalClaimToInput(wire);
    expect(input.selectedExtractionId).toBeNull();
    expect(input.requiresReasoning).toBe(false);
    expect(input.criteria).toEqual([{ criterion_id: "criterion", max_points: null }]);
    expect(input.canonicalPackage).toMatchObject({ problem: { statement: "1+1" }, attempt: { typed_answer: "2" } });
    wire.context.attempt.typed_answer = "changed";
    expect(input.canonicalPackage).toMatchObject({ attempt: { typed_answer: "2" } });
  });
  it("fails closed on missing pinned profile/unknown origin", () => {
    expect(() => physicalClaimToInput({ ...claim(), context: {} })).toThrow("INVALID_CLAIM");
    const wire = claim(); wire.context.solutions[0].origin = "invented";
    expect(() => physicalClaimToInput(wire)).toThrow("INVALID_CLAIM");
  });
});
