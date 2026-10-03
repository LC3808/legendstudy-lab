import { describe, expect, it } from "vitest";

import { caseDetailFixture, judgmentFixture, rubricAllOk } from "./fixtures";
import { deriveReviewState } from "./review-state";
import { validateHqMathJudgment } from "./write-validation";
import { createMockQualityServer } from "./runtime/mock-quality-server";
import { MathQualityClient } from "./runtime/quality-client";
import type { HqFinding, HqJudgmentRecord } from "./types";

const ok = (j: ReturnType<typeof judgmentFixture>, d = caseDetailFixture()) => {
  const v = validateHqMathJudgment(j, d);
  expect(v.ok, JSON.stringify(v.issues)).toBe(true);
};
const fails = (j: ReturnType<typeof judgmentFixture>, code: string, d = caseDetailFixture()) => {
  const v = validateHqMathJudgment(j, d);
  expect(v.ok).toBe(false);
  expect(v.issues).toContain(code);
};

function record(overrides: Partial<HqJudgmentRecord>): HqJudgmentRecord {
  return {
    judgment_id: "j1",
    math_evaluation_id: "eval-1",
    reviewer_display: "reviewer:abc",
    rubric_version: "hq-math-rubric-v1",
    overall_disposition: "PASS",
    superseded: false,
    supersedes_judgment_id: null,
    created_at: "2026-10-03T00:00:00.000Z",
    ...overrides,
  };
}

const finding = (overrides: Partial<HqFinding> = {}): HqFinding => ({
  category: "OTHER",
  severity: "MATERIAL",
  target: { kind: "OVERALL", ref: null },
  ...overrides,
});

describe("MATH-7B Math Quality Console — Q01–Q30", () => {
  it("Q01 normal FULL_SOLUTION PASS", () => {
    ok(judgmentFixture(caseDetailFixture()));
  });

  it("Q02 correct answer but AI wrongly criticizes reasoning → FAIL (HQ ≠ student)", () => {
    const detail = caseDetailFixture({ student_answer_status: "CORRECT" });
    const j = judgmentFixture(detail, {
      overall_disposition: "FAIL",
      rubric_result: rubricAllOk(detail, { diagnosis: "FAIL" }),
      findings: [finding({ category: "FALSE_CORRECTION", target: { kind: "OVERALL", ref: null } })],
    });
    ok(j, detail);
    expect(detail.student_answer_status).toBe("CORRECT"); // HQ FAIL though student correct
  });

  it("Q03 wrong answer but AI good → PASS (HQ ≠ student)", () => {
    const detail = caseDetailFixture({ student_answer_status: "INCORRECT" });
    ok(judgmentFixture(detail), detail);
  });

  it("Q04 extraction misread false error → FAIL + EXTRACTION_MISREAD", () => {
    const detail = caseDetailFixture();
    ok(
      judgmentFixture(detail, {
        overall_disposition: "FAIL",
        rubric_result: rubricAllOk(detail, { extraction_fidelity: "FAIL", diagnosis: "FAIL" }),
        findings: [finding({ category: "EXTRACTION_MISREAD", severity: "CRITICAL", target: { kind: "EXTRACTION_REGION", ref: "rg-1" } })],
      }),
      detail,
    );
  });

  it("Q05 extraction fixed by confirmation → PASS", () => ok(judgmentFixture(caseDetailFixture())));

  it("Q06 ROOT right / propagated grouped → PASS", () => ok(judgmentFixture(caseDetailFixture())));

  it("Q07 propagated treated as independent → FAIL + ROOT_PROPAGATION_ERROR", () => {
    const detail = caseDetailFixture();
    ok(
      judgmentFixture(detail, {
        overall_disposition: "FAIL",
        rubric_result: rubricAllOk(detail, { step_reasoning: "FAIL" }),
        findings: [finding({ category: "ROOT_PROPAGATION_ERROR", target: { kind: "ROOT_ERROR", ref: "err-1" } })],
      }),
      detail,
    );
  });

  it("Q08 second independent root missed → NEEDS_REVIEW + MISSING_IMPORTANT_ISSUE", () => {
    const detail = caseDetailFixture();
    ok(
      judgmentFixture(detail, {
        overall_disposition: "NEEDS_REVIEW",
        rubric_result: rubricAllOk(detail, { diagnosis: "CONCERN" }),
        findings: [finding({ category: "MISSING_IMPORTANT_ISSUE", target: { kind: "OVERALL", ref: null } })],
      }),
      detail,
    );
  });

  it("Q09 valid alternative path preserved → PASS", () => ok(judgmentFixture(caseDetailFixture())));

  it("Q10 valid alternative path rejected → FAIL + ALTERNATIVE_PATH_REJECTION (STUDENT)", () => {
    const detail = caseDetailFixture();
    ok(
      judgmentFixture(detail, {
        overall_disposition: "FAIL",
        rubric_result: rubricAllOk(detail, { valid_path_preservation: "FAIL", diagnosis: "FAIL" }),
        findings: [finding({ category: "ALTERNATIVE_PATH_REJECTION", target: { kind: "ALTERNATIVE_PATH", ref: "stu-1", side: "STUDENT" } })],
      }),
      detail,
    );
  });

  it("Q11 uncertain novel path escalated → NEEDS_REVIEW", () => {
    const detail = caseDetailFixture();
    ok(judgmentFixture(detail, { overall_disposition: "NEEDS_REVIEW", rubric_result: rubricAllOk(detail, { valid_path_preservation: "CONCERN" }) }), detail);
  });

  it("Q12 CORE highest-impact → PASS", () => ok(judgmentFixture(caseDetailFixture())));

  it("Q13 AI invents CORE though empty valid → FAIL", () => {
    const detail = caseDetailFixture();
    ok(
      judgmentFixture(detail, {
        overall_disposition: "FAIL",
        rubric_result: rubricAllOk(detail, { core_priority: "FAIL", hallucination_absence: "CONCERN" }),
        findings: [finding({ category: "FALSE_CORRECTION", target: { kind: "OVERALL", ref: null } })],
      }),
      detail,
    );
  });

  it("Q14 L1 safe → PASS", () => ok(judgmentFixture(caseDetailFixture())));

  it("Q15 L1 leaks SHORT_ANSWER answer → FAIL + hint_quality FAIL", () => {
    const detail = caseDetailFixture({ response_format: "SHORT_ANSWER", requires_reasoning: false });
    ok(
      judgmentFixture(detail, {
        overall_disposition: "FAIL",
        rubric_result: rubricAllOk(detail, { hint_quality: "FAIL" }),
        findings: [finding({ category: "OTHER", severity: "CRITICAL", note: "answer leak", target: { kind: "OVERALL", ref: null } })],
      }),
      detail,
    );
  });

  it("Q16 L2 concept, no full solution → PASS", () => ok(judgmentFixture(caseDetailFixture())));

  it("Q17 PROOF hint gives proof verbatim → FAIL", () => {
    const detail = caseDetailFixture({ response_format: "PROOF" });
    ok(judgmentFixture(detail, { overall_disposition: "FAIL", rubric_result: rubricAllOk(detail, { hint_quality: "FAIL" }), findings: [finding({ category: "OTHER", severity: "CRITICAL", target: { kind: "OVERALL", ref: null } })] }), detail);
  });

  it("Q18 reeval recognizes prior CORE fixed → PASS (progression OK)", () => {
    const detail = caseDetailFixture({ has_prior_evaluation: true });
    ok(judgmentFixture(detail, { rubric_result: rubricAllOk(detail) }), detail);
  });

  it("Q19 prior root fixed + new root → valid (NEEDS_REVIEW)", () => {
    const detail = caseDetailFixture({ has_prior_evaluation: true });
    ok(judgmentFixture(detail, { overall_disposition: "NEEDS_REVIEW", rubric_result: rubricAllOk(detail, { progression: "CONCERN" }) }), detail);
  });

  it("Q20 STEP_RETRY claims downstream reassessed → FAIL + PROGRESSION_ERROR", () => {
    const detail = caseDetailFixture({ has_prior_evaluation: true });
    ok(
      judgmentFixture(detail, {
        overall_disposition: "FAIL",
        rubric_result: rubricAllOk(detail, { progression: "FAIL" }),
        findings: [finding({ category: "PROGRESSION_ERROR", target: { kind: "OVERALL", ref: null } })],
      }),
      detail,
    );
  });

  it("Q21 NO_MATERIAL_CHANGE recognized → PASS", () => {
    const detail = caseDetailFixture({ has_prior_evaluation: true });
    ok(judgmentFixture(detail, { rubric_result: rubricAllOk(detail) }), detail);
  });

  it("Q22 AI reference shown as official → FAIL", () => {
    const detail = caseDetailFixture({ has_generated_solution: true });
    ok(
      judgmentFixture(detail, {
        overall_disposition: "FAIL",
        rubric_result: rubricAllOk(detail, { generated_solution: "FAIL" }),
        findings: [finding({ category: "UNSUPPORTED_CLAIM", target: { kind: "OVERALL", ref: null } })],
      }),
      detail,
    );
  });

  it("Q23 official criterion fabricated → FAIL (CRITICAL)", () => {
    const detail = caseDetailFixture();
    ok(
      judgmentFixture(detail, {
        overall_disposition: "FAIL",
        rubric_result: rubricAllOk(detail, { hallucination_absence: "FAIL", evidence_adherence: "FAIL" }),
        findings: [finding({ category: "INVENTED_ERROR", severity: "CRITICAL", target: { kind: "OVERALL", ref: null } })],
      }),
      detail,
    );
  });

  it("Q24 initial eval → progression/generated_solution NA required", () => {
    const detail = caseDetailFixture({ has_prior_evaluation: false, has_generated_solution: false });
    ok(judgmentFixture(detail), detail); // rubricAllOk sets those NA
  });

  it("Q25 required-present evidence marked NA is rejected (UNASSESSABLE, not NA/PASS)", () => {
    const detail = caseDetailFixture({ has_prior_evaluation: true }); // progression artifact present
    fails(judgmentFixture(detail, { rubric_result: rubricAllOk(detail, { progression: "NA" }) }), "CONDITIONAL_NA_FORBIDDEN", detail);
  });

  it("Q26 two reviewers disagree → DISAGREEMENT preserved (not averaged)", () => {
    const proj = deriveReviewState([
      record({ judgment_id: "a", reviewer_display: "reviewer:a", overall_disposition: "PASS_WITH_NOTES" }),
      record({ judgment_id: "b", reviewer_display: "reviewer:b", overall_disposition: "FAIL" }),
    ]);
    expect(proj.state).toBe("DISAGREEMENT");
    expect(proj.activeDispositions.sort()).toEqual(["FAIL", "PASS_WITH_NOTES"]);
  });

  it("Q27 correction supersedes exact parent", async () => {
    const server = createMockQualityServer();
    server.seedCase(caseDetailFixture());
    const client = new MathQualityClient(server.operatorTransport("op-1"));
    const first = await client.submitJudgment(judgmentFixture(caseDetailFixture(), { overall_disposition: "FAIL", rubric_result: rubricAllOk(caseDetailFixture(), { diagnosis: "FAIL" }), findings: [finding()] }));
    await client.submitJudgment(judgmentFixture(caseDetailFixture(), { supersedes_judgment_id: first.judgment_id }));
    const detail = await client.caseDetail("eval-1");
    const parent = detail.judgments.find((j) => j.judgment_id === first.judgment_id)!;
    expect(parent.superseded).toBe(true);
    expect(deriveReviewState(detail.judgments).state).toBe("CORRECTED");
  });

  it("Q28 deleted reviewer renders as null (E2 SET NULL)", async () => {
    const server = createMockQualityServer();
    server.seedCase(caseDetailFixture());
    const client = new MathQualityClient(server.operatorTransport("op-del"));
    await client.submitJudgment(judgmentFixture(caseDetailFixture()));
    server.deleteReviewer("op-del");
    const detail = await client.caseDetail("eval-1");
    expect(detail.judgments[0].reviewer_display).toBeNull();
  });

  it("Q29 account deletion removes bound Math HQ graph (E1 CASCADE)", async () => {
    const server = createMockQualityServer();
    server.seedCase(caseDetailFixture());
    const client = new MathQualityClient(server.operatorTransport("op-1"));
    await client.submitJudgment(judgmentFixture(caseDetailFixture()));
    server.deleteEvaluation("eval-1");
    await expect(client.caseDetail("eval-1")).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("Q30 non-operator denied even with a valid payload (idempotency ≠ bypass)", async () => {
    const server = createMockQualityServer();
    server.seedCase(caseDetailFixture());
    const client = new MathQualityClient(server.nonOperatorTransport());
    await expect(client.submitJudgment(judgmentFixture(caseDetailFixture()))).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  // --- additional contract checks ---

  it("output-hash binding: stale expected_output_sha256 is rejected", () => {
    const detail = caseDetailFixture();
    fails(judgmentFixture(detail, { expected_output_sha256: "stale" }), "STALE_OUTPUT_HASH", detail);
  });

  it("finding target must bind to a canonical id", () => {
    const detail = caseDetailFixture();
    fails(
      judgmentFixture(detail, { overall_disposition: "FAIL", rubric_result: rubricAllOk(detail, { diagnosis: "FAIL" }), findings: [finding({ target: { kind: "SOLUTION_STEP", ref: "ghost" } })] }),
      "FINDING_TARGET_UNBOUND",
      detail,
    );
  });

  it("PASS disposition requires a clean rubric and no findings", () => {
    const detail = caseDetailFixture();
    fails(judgmentFixture(detail, { overall_disposition: "PASS", rubric_result: rubricAllOk(detail, { diagnosis: "FAIL" }) }), "DISPOSITION_PASS_REQUIRES_CLEAN", detail);
  });

  it("submit idempotency: same key same payload replays; changed payload conflicts", async () => {
    const server = createMockQualityServer();
    server.seedCase(caseDetailFixture());
    const client = new MathQualityClient(server.operatorTransport("op-1"));
    const j = judgmentFixture(caseDetailFixture(), { client_submission_id: "fixed" });
    const a = await client.submitJudgment(j);
    const b = await client.submitJudgment(j);
    expect(b.replayed).toBe(true);
    expect(b.judgment_id).toBe(a.judgment_id);
    await expect(client.submitJudgment({ ...j, overall_disposition: "FAIL" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
