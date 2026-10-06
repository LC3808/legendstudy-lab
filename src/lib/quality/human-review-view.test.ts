import { describe, expect, it } from "vitest";

import {
  buildSubmitPayload,
  conditionalApplicability,
  emptyDraft,
  expectedOutputSha256,
  extractFindingTargets,
  reviewerLabel,
  validateDraft,
  type HumanReviewDraft,
} from "./human-review-view";
import { hqTargetDetailFixture } from "./human-review-fixtures";
import { HQ_ALL_DIMENSIONS } from "./human-review-contract";

const targets = extractFindingTargets(hqTargetDetailFixture);
const applic = conditionalApplicability(hqTargetDetailFixture);

function baseDraft(): HumanReviewDraft {
  const draft = emptyDraft(applic);
  draft.overall_disposition = "PASS";
  for (const dim of ["diagnosis", "core_priority", "actionability", "evidence_adherence", "stance_preservation", "hallucination_absence"] as const) {
    draft.rubric[dim] = "OK";
  }
  // sentence_feedback + generated_rewrite applicable in this fixture → real verdicts;
  // progression not applicable → emptyDraft already locked it to NA.
  draft.rubric.sentence_feedback = "OK";
  draft.rubric.generated_rewrite = "OK";
  draft.official_source_reviewed = true;
  return draft;
}

describe("conditionalApplicability", () => {
  it("derives sentence/progression/generated_rewrite applicability from detail", () => {
    expect(applic.sentence_feedback).toBe(true); // sentence_feedback[] populated
    expect(applic.generated_rewrite).toBe(true); // completed rewrite present
    expect(applic.progression).toBe(false); // no prior progress / history
  });
});

describe("extractFindingTargets", () => {
  it("builds every target kind strictly from the loaded detail", () => {
    const kinds = new Set(targets.map((t) => t.kind));
    expect(kinds).toEqual(new Set(["OVERALL", "DIMENSION", "PROGRESS", "ISSUE_KEY", "SENTENCE", "EVIDENCE_LINK", "GENERATED_REWRITE"]));
    const sentence = targets.find((t) => t.kind === "SENTENCE");
    expect(sentence?.ref).toEqual({ progress_id: "pppppppp-0000-0000-0000-000000000001", observation_key: "s-1" });
    const dimension = targets.find((t) => t.kind === "DIMENSION");
    expect(dimension?.ref).toEqual({ dimension_id: "dddddddd-0000-0000-0000-000000000001" });
    expect(targets.find((t) => t.kind === "OVERALL")?.ref).toBeNull();
  });
});

describe("buildSubmitPayload", () => {
  it("emits all 9 rubric keys, defaults, and canonical versions", () => {
    const payload = buildSubmitPayload({
      draft: baseDraft(),
      evaluationId: hqTargetDetailFixture.evaluation_id,
      expectedOutputSha256: "a".repeat(64),
      clientSubmissionId: "cid-1",
      targets,
    });
    expect(payload.dto_version).toBe("hq-write-v1");
    expect(payload.rubric_version).toBe("hq-rubric-v1");
    expect(payload.official_source_reviewed).toBe(true);
    expect(Object.keys(payload.rubric_result).sort()).toEqual([...HQ_ALL_DIMENSIONS].sort());
    expect(payload.rubric_result.sentence_feedback).toBe("OK"); // applicable → real verdict
    expect(payload.rubric_result.progression).toBe("NA"); // not applicable → NA
    expect(payload.selection_reason).toBe("EARLY_CENSUS");
    expect(payload.recommended_action).toBe("NONE");
    expect(payload.summary_note).toBeNull();
    expect(payload.findings).toEqual([]);
  });

  it("maps a finding target option to its canonical target_ref + preserves order", () => {
    const draft = baseDraft();
    draft.overall_disposition = "FAIL";
    draft.rubric.diagnosis = "FAIL";
    const dim = targets.find((t) => t.kind === "DIMENSION")!;
    draft.findings = [
      { issue_category: "EVIDENCE_MISREAD", severity: "MATERIAL", targetOptionKey: dim.key, note: "n" },
      { issue_category: "OTHER", severity: "MINOR", targetOptionKey: "OVERALL", note: "" },
    ];
    const payload = buildSubmitPayload({ draft, evaluationId: "e", expectedOutputSha256: "a".repeat(64), clientSubmissionId: "c", targets });
    expect(payload.findings[0]).toEqual({ issue_category: "EVIDENCE_MISREAD", severity: "MATERIAL", target_kind: "DIMENSION", target_ref: dim.ref, note: "n" });
    expect(payload.findings[1].target_ref).toBeNull();
    expect(payload.findings[1].note).toBeNull();
  });

  it("includes supersedes_judgment_id for a correction", () => {
    const draft = baseDraft();
    draft.supersedes_judgment_id = "parent-1";
    const payload = buildSubmitPayload({ draft, evaluationId: "e", expectedOutputSha256: "a".repeat(64), clientSubmissionId: "c", targets });
    expect(payload.supersedes_judgment_id).toBe("parent-1");
  });
});

describe("validateDraft (mirrors server consistency for UX)", () => {
  it("passes a clean PASS with no findings", () => {
    expect(validateDraft(baseDraft(), applic, targets)).toEqual([]);
  });

  it("blocks PASS that carries a finding", () => {
    const draft = baseDraft();
    draft.findings = [{ issue_category: "OTHER", severity: "MINOR", targetOptionKey: "OVERALL", note: "" }];
    expect(validateDraft(draft, applic, targets).some((e) => e.includes("이슈를 추가할 수 없습니다"))).toBe(true);
  });

  it("blocks PASS_WITH_NOTES with a non-minor finding", () => {
    const draft = baseDraft();
    draft.overall_disposition = "PASS_WITH_NOTES";
    draft.findings = [{ issue_category: "INVENTED_ERROR", severity: "MATERIAL", targetOptionKey: "OVERALL", note: "" }];
    expect(validateDraft(draft, applic, targets).some((e) => e.includes("경미(MINOR)만"))).toBe(true);
  });

  it("blocks PASS when a blocking dimension is FAIL", () => {
    const draft = baseDraft();
    draft.rubric.hallucination_absence = "FAIL";
    expect(validateDraft(draft, applic, targets).some((e) => e.includes("양호/해당 없음"))).toBe(true);
  });

  it("requires a real verdict for an applicable conditional dimension", () => {
    const draft = baseDraft();
    draft.rubric.generated_rewrite = "NA"; // applicable → NA invalid
    expect(validateDraft(draft, applic, targets).some((e) => e.includes("조건부 항목 판정 필요"))).toBe(true);
  });

  it("requires official-source attestation", () => {
    const draft = baseDraft();
    draft.official_source_reviewed = false;
    expect(validateDraft(draft, applic, targets).some((e) => e.includes("공식 자료"))).toBe(true);
  });
});

describe("reviewerLabel + sha", () => {
  it("renders deleted reviewer safely and never an id/email", () => {
    expect(reviewerLabel({ reviewer_state: "DELETED_OR_UNAVAILABLE", reviewer_user_id: null })).toBe("삭제된 리뷰어");
    const present = reviewerLabel({ reviewer_state: "AVAILABLE", reviewer_user_id: "0000aaaa-0000-0000-0000-000000000001" });
    expect(present).toMatch(/^운영자 /);
    expect(present).not.toContain("@");
  });

  it("reads expected output sha from provenance", () => {
    expect(expectedOutputSha256(hqTargetDetailFixture)).toBe("a".repeat(64));
    expect(expectedOutputSha256(null)).toBeNull();
  });
});
