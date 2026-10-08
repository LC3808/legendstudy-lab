import { describe, expect, it } from "vitest";

import { baseOutput, evalError, evalInput, shortAnswerOutput, step } from "./fixtures";
import { createScriptedEvaluator } from "./evaluator";
import { validateMathEval, type ValidationCode } from "./validation";
import { createMockEvalServer } from "./runtime/mock-eval-server";
import { MathEvaluationWorkerClient, runWorkerEvaluation } from "./runtime/worker-client";
import type { ClaimContext } from "./runtime/contract";
import type { MathEvaluationInput, MathEvalOutput } from "./types";

function expectValid(output: MathEvalOutput, input: MathEvaluationInput) {
  const v = validateMathEval(output, input);
  expect(v.ok, JSON.stringify(v.issues)).toBe(true);
  return v;
}
function expectIssue(output: MathEvalOutput, input: MathEvaluationInput, code: ValidationCode) {
  const v = validateMathEval(output, input);
  expect(v.ok).toBe(false);
  expect(v.issues.map((i) => i.code)).toContain(code);
}

function ctx(overrides: Partial<ClaimContext> = {}): ClaimContext {
  return {
    attempt: { attempt_id: "att-1", kind: "INITIAL", input_kind: "EVIDENCE", prior_evaluation_id: null },
    leaf: { id: "leaf-1", response_format: "FULL_SOLUTION" },
    profile: { requires_reasoning: true },
    selected_extraction_id: "run-c1",
    extraction_region_ids: ["rg-1", "rg-2", "rg-3"],
    criteria: [],
    solutions: [{ id: "sol-official", provenance: "OFFICIAL" }],
    ...overrides,
  };
}

describe("MATH-4B evaluation engine — E01–E35", () => {
  // --- validator-level cases (E01–E29) ---

  it("E01 SHORT_ANSWER correct '12'", () => {
    expectValid(shortAnswerOutput(), evalInput({ responseFormat: "SHORT_ANSWER", requiresReasoning: false }));
  });

  it("E02 SHORT_ANSWER wrong answer", () => {
    const out = shortAnswerOutput({ overall: { status: "COMPLETE", diagnostic: "NOT_DETERMINABLE", answer: "INCORRECT", coverage: "ATTEMPTED" } });
    expectValid(out, evalInput({ responseFormat: "SHORT_ANSWER", requiresReasoning: false }));
  });

  it("E03 SHORT_ANSWER invented reasoning error is rejected", () => {
    const out = shortAnswerOutput({ steps: [step()], errors: [evalError()] });
    expectIssue(out, evalInput({ responseFormat: "SHORT_ANSWER", requiresReasoning: false }), "SHORT_ANSWER_INVENTED_ERROR");
  });

  it("E04 SHORT_REASONING correct + adequate reasoning", () => {
    expectValid(baseOutput(), evalInput({ responseFormat: "SHORT_REASONING" }));
  });

  it("E05 SHORT_REASONING correct answer + insufficient justification (both facts preserved)", () => {
    const out = baseOutput({
      rubric: { rubric_version: "math-rubric-v1", dimensions: { justification_completeness: "INSUFFICIENT" } },
      overall: { status: "COMPLETE", diagnostic: "ANSWER_CORRECT_REASONING_INCOMPLETE", answer: "CORRECT", coverage: "ATTEMPTED" },
    });
    expectValid(out, evalInput({ responseFormat: "SHORT_REASONING" }));
  });

  it("E06 FULL_SOLUTION correct", () => {
    expectValid(baseOutput(), evalInput());
  });

  it("E07 correct final answer + invalid intermediate reasoning (answer != path)", () => {
    const out = baseOutput({
      steps: [step({ id: "s1", status: "INVALID", regions: ["rg-1"] })],
      errors: [evalError({ id: "e1", step_id: "s1", classification: "ROOT", materiality: "MATERIAL" })],
      overall: { status: "COMPLETE", diagnostic: "ANSWER_CORRECT_REASONING_INCOMPLETE", answer: "CORRECT", coverage: "ATTEMPTED" },
    });
    expectValid(out, evalInput());
    expect(out.overall.answer).toBe("CORRECT");
    expect(out.errors).toHaveLength(1);
  });

  it("E08 wrong final answer + mostly valid path", () => {
    const out = baseOutput({
      steps: [step({ id: "s1" }), step({ id: "s2", position: 1, status: "CALCULATION_ERROR", regions: ["rg-2"] })],
      errors: [evalError({ id: "e1", step_id: "s2", classification: "ROOT", category: "CALCULATION", materiality: "MATERIAL" })],
      overall: { status: "COMPLETE", diagnostic: "ANSWER_INCORRECT_APPROACH_MOSTLY_VALID", answer: "INCORRECT", coverage: "ATTEMPTED" },
    });
    expectValid(out, evalInput());
  });

  it("E09 one root sign error + two propagated consequences", () => {
    const out = baseOutput({
      steps: [step({ id: "s1" }), step({ id: "s2", position: 1, regions: ["rg-2"] }), step({ id: "s3", position: 2, regions: ["rg-3"] })],
      errors: [
        evalError({ id: "root", step_id: "s1", classification: "ROOT", category: "SIGN", materiality: "MATERIAL" }),
        evalError({ id: "p1", step_id: "s2", classification: "PROPAGATED", category: "CALCULATION", materiality: "MATERIAL" }),
        evalError({ id: "p2", step_id: "s3", classification: "PROPAGATED", category: "CALCULATION", materiality: "MATERIAL" }),
      ],
      causes: [{ root: "root", consequence: "p1" }, { root: "root", consequence: "p2" }],
      overall: { status: "COMPLETE", diagnostic: "ANSWER_INCORRECT_APPROACH_MOSTLY_VALID", answer: "INCORRECT", coverage: "ATTEMPTED" },
    });
    expectValid(out, evalInput());
  });

  it("E10 two independent roots", () => {
    const out = baseOutput({
      steps: [step({ id: "s1" }), step({ id: "s2", position: 1, regions: ["rg-2"] })],
      errors: [
        evalError({ id: "rA", step_id: "s1", classification: "ROOT", materiality: "MATERIAL" }),
        evalError({ id: "rB", step_id: "s2", classification: "ROOT", category: "CASE_OMISSION", materiality: "MATERIAL" }),
      ],
      overall: { status: "COMPLETE", diagnostic: "FUNDAMENTAL_APPROACH_ERROR", answer: "INCORRECT", coverage: "ATTEMPTED" },
    });
    expectValid(out, evalInput());
  });

  it("E11 propagated error with no cause is rejected", () => {
    const out = baseOutput({
      steps: [step({ id: "s1" })],
      errors: [evalError({ id: "p1", step_id: "s1", classification: "PROPAGATED", materiality: "MATERIAL" })],
    });
    expectIssue(out, evalInput(), "PROPAGATED_WITHOUT_CAUSE");
  });

  it("E12 valid alternative path accepted", () => {
    const out = baseOutput({ paths: [{ key: "primary", verdict: "ALTERNATIVE_VALID_PATH", explanation: "" }] });
    expectValid(out, evalInput());
  });

  it("E13 valid novel path not in official solution", () => {
    const out = baseOutput({ paths: [{ key: "primary", verdict: "ALTERNATIVE_VALID_PATH", explanation: "novel" }], references: [] });
    expectValid(out, evalInput());
  });

  it("E14 uncertain equivalence → human review (valid evaluation)", () => {
    const out = baseOutput({
      paths: [{ key: "primary", verdict: "MATHEMATICAL_EQUIVALENCE_UNCERTAIN", explanation: "" }],
      overall: { status: "NEEDS_HUMAN_REVIEW", diagnostic: "NOT_DETERMINABLE", answer: "NOT_DETERMINABLE", coverage: "ATTEMPTED" },
    });
    expectValid(out, evalInput());
  });

  it("E15 official reference", () => {
    expectValid(baseOutput({ references: ["sol-official"] }), evalInput({ authoritySolutions: [{ id: "sol-official", provenance: "OFFICIAL" }] }));
  });

  it("E16 verified internal reference", () => {
    expectValid(baseOutput({ references: ["sol-vi"] }), evalInput({ authoritySolutions: [{ id: "sol-vi", provenance: "VERIFIED_INTERNAL" }] }));
  });

  it("E17 AI reference cannot masquerade as official (unpinned reference rejected)", () => {
    const out = baseOutput({ references: ["sol-ai"], generated_solution: { origin: "AI_GENERATED_REFERENCE", body: "…" } });
    expectIssue(out, evalInput({ authoritySolutions: [{ id: "sol-official", provenance: "OFFICIAL" }] }), "UNPINNED_REFERENCE");
  });

  it("E18 official points available", () => {
    const out = baseOutput({ criteria: [{ criterion_id: "c1", satisfied: "SATISFIED", awarded_points: 10, reason: "" }] });
    expectValid(out, evalInput({ criteria: [{ criterion_id: "c1", max_points: 10 }] }));
  });

  it("E19 no official points → no invented score", () => {
    const out = baseOutput({ criteria: [{ criterion_id: "c1", satisfied: "SATISFIED", awarded_points: 5, reason: "" }] });
    expectIssue(out, evalInput({ criteria: [{ criterion_id: "c1", max_points: null }] }), "INVENTED_POINTS");
  });

  it("E20 extraction uncertainty cannot become a grounded student error", () => {
    const out = baseOutput({ steps: [step({ id: "s1", regions: ["rg-not-extracted"] })] });
    expectIssue(out, evalInput(), "UNGROUNDED_STEP_REGION");
  });

  it("E21 invalid DAG cycle rejected", () => {
    const out = baseOutput({
      steps: [step({ id: "a" }), step({ id: "b", position: 1, regions: ["rg-2"] })],
      edges: [{ from: "a", to: "b" }, { from: "b", to: "a" }],
    });
    expectIssue(out, evalInput(), "DAG_CYCLE");
  });

  it("E22 self-edge rejected", () => {
    const out = baseOutput({ steps: [step({ id: "a" })], edges: [{ from: "a", to: "a" }] });
    expectIssue(out, evalInput(), "SELF_EDGE");
  });

  it("E23 cross-evaluation / missing endpoint edge rejected", () => {
    const out = baseOutput({ steps: [step({ id: "a" })], edges: [{ from: "a", to: "ghost" }] });
    expectIssue(out, evalInput(), "MISSING_EDGE_ENDPOINT");
  });

  it("E24 causal propagation is distinct from logical dependency", () => {
    const out = baseOutput({
      steps: [step({ id: "s1" }), step({ id: "s2", position: 1, regions: ["rg-2"] })],
      edges: [{ from: "s1", to: "s2" }],
      errors: [
        evalError({ id: "root", step_id: "s1", classification: "ROOT", materiality: "MATERIAL" }),
        evalError({ id: "p1", step_id: "s2", classification: "PROPAGATED", materiality: "MATERIAL" }),
      ],
      causes: [{ root: "root", consequence: "p1" }],
      overall: { status: "COMPLETE", diagnostic: "ANSWER_INCORRECT_APPROACH_MOSTLY_VALID", answer: "INCORRECT", coverage: "ATTEMPTED" },
    });
    expectValid(out, evalInput());
    expect(out.edges).not.toEqual(out.causes); // separate structures
  });

  it("E25 CORE can be empty", () => {
    const out = baseOutput({ core: [] });
    expectValid(out, evalInput());
    expect(out.core).toHaveLength(0);
  });

  it("E26 material root provides MATH-5 handoff facts", () => {
    const out = baseOutput({
      steps: [step({ id: "s1", status: "CALCULATION_ERROR" })],
      errors: [evalError({ id: "e1", step_id: "s1", classification: "ROOT", materiality: "MATERIAL" })],
      core: [{ id: "core-1", position: 0, error_id: "e1", step_id: "s1", title: "부호", diagnosis: "부호 오류", why: "이후 계산에 영향", next_action: "3단계부터 다시" }],
      overall: { status: "COMPLETE", diagnostic: "ANSWER_INCORRECT_APPROACH_MOSTLY_VALID", answer: "INCORRECT", coverage: "ATTEMPTED" },
    });
    expectValid(out, evalInput());
    expect(out.core[0].error_id).toBe("e1");
    expect(out.core[0].next_action.length).toBeGreaterThan(0);
  });

  it("E27 unsupported CORE claim (nonexistent error) rejected", () => {
    const out = baseOutput({ core: [{ id: "c", position: 0, error_id: "ghost", step_id: null, title: "", diagnosis: "", why: "", next_action: "" }] });
    expectIssue(out, evalInput(), "CORE_BINDING");
  });

  it("E28 hallucinated student step (error bound to missing step) rejected", () => {
    const out = baseOutput({ errors: [evalError({ id: "e1", step_id: "ghost", classification: "ROOT", materiality: "MATERIAL" })] });
    expectIssue(out, evalInput(), "ERROR_STEP_BINDING");
  });

  it("E29 unknown rubric version rejected", () => {
    const out = baseOutput({ rubric: { rubric_version: "math-rubric-v2", dimensions: {} } });
    expectIssue(out, evalInput(), "UNKNOWN_RUBRIC_VERSION");
  });

  // --- runtime-level cases (E30–E35) ---

  function seedAndWorker(opts: { lifecycle?: Record<string, "ACTIVE" | "PENDING" | "ERASING">; context?: Partial<ClaimContext> } = {}) {
    const server = createMockEvalServer({ lifecycle: opts.lifecycle });
    server.seedEvaluation({ evaluation_id: "eval-1", owner: "student-A", context: ctx(opts.context) });
    const worker = new MathEvaluationWorkerClient(server.workerTransport());
    return { server, worker };
  }

  it("E30 malformed/invalid output is failed, never partially finalized", async () => {
    const { server, worker } = seedAndWorker();
    const badOutput = baseOutput({ steps: [step({ id: "a" }), step({ id: "b", position: 1, regions: ["rg-2"] })], edges: [{ from: "a", to: "b" }, { from: "b", to: "a" }] });
    const res = await runWorkerEvaluation({ worker, evaluationId: "eval-1", adapter: createScriptedEvaluator("mock", "m", badOutput) });
    expect(res.finalized).toBe(false);
    expect(res.failed).toBe(true);
    expect(server.state.evaluations.get("eval-1")!.state).toBe("FAILED");
  });

  it("E31 stale evaluation fence (wrong lease token) rejected", async () => {
    const { worker } = seedAndWorker();
    await worker.claim("eval-1");
    await expect(worker.finalize("eval-1", "wrong-token", baseOutput())).rejects.toMatchObject({ code: "INVALID_OR_STALE" });
  });

  it("E32 duplicate exact finalize is idempotent", async () => {
    const { worker } = seedAndWorker();
    const claim = await worker.claim("eval-1");
    const id1 = await worker.finalize("eval-1", claim.lease_token, baseOutput());
    const id2 = await worker.finalize("eval-1", claim.lease_token, baseOutput());
    expect(id2).toBe(id1);
  });

  it("E33 changed duplicate finalize conflicts", async () => {
    const { worker } = seedAndWorker();
    const claim = await worker.claim("eval-1");
    await worker.finalize("eval-1", claim.lease_token, baseOutput());
    await expect(worker.finalize("eval-1", claim.lease_token, baseOutput({ paths: [] }))).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("E34 lifecycle restriction wins", async () => {
    const { worker } = seedAndWorker({ lifecycle: { "student-A": "ERASING" } });
    await expect(worker.claim("eval-1")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("E35 HUMAN_REVIEW_REQUIRED is a valid evaluation, not a processing failure", async () => {
    const { server, worker } = seedAndWorker();
    const out = baseOutput({
      paths: [{ key: "primary", verdict: "MATHEMATICAL_EQUIVALENCE_UNCERTAIN", explanation: "" }],
      overall: { status: "NEEDS_HUMAN_REVIEW", diagnostic: "NOT_DETERMINABLE", answer: "NOT_DETERMINABLE", coverage: "ATTEMPTED" },
    });
    const res = await runWorkerEvaluation({ worker, evaluationId: "eval-1", adapter: createScriptedEvaluator("mock", "m", out) });
    expect(res.finalized).toBe(true);
    expect(res.failed).toBe(false);
    expect(server.state.evaluations.get("eval-1")!.state).toBe("COMPLETED");
  });

  it("students cannot finalize their own evaluation (worker-only surface)", async () => {
    const server = createMockEvalServer();
    server.seedEvaluation({ evaluation_id: "eval-1", owner: "student-A", context: ctx() });
    const studentWorker = new MathEvaluationWorkerClient(server.studentTransport());
    await expect(studentWorker.finalize("eval-1", "x", baseOutput())).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
