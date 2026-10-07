import { describe, expect, it } from "vitest";

import {
  availabilityOf,
  detailGroupAvailability,
  hasGeneratedRewrite,
  partitionImprovements,
  studentRewriteAttempts,
} from "./view";
import { qualityCaseDetailFixture } from "./fixtures";
import type { QualityImprovement } from "./contract";

describe("availabilityOf (T12, T14)", () => {
  it("distinguishes unavailable (null/absent) from empty ([]) from present", () => {
    expect(availabilityOf(null)).toBe("unavailable");
    expect(availabilityOf(undefined)).toBe("unavailable");
    expect(availabilityOf([])).toBe("empty");
    expect(availabilityOf({})).toBe("empty");
    expect(availabilityOf("")).toBe("empty");
    expect(availabilityOf(["x"])).toBe("present");
    expect(availabilityOf({ a: 1 })).toBe("present");
    expect(availabilityOf("text")).toBe("present");
    expect(availabilityOf(0)).toBe("present");
  });

  it("T14: scaffolding unavailable (null) is distinct from an empty collection", () => {
    expect(availabilityOf(qualityCaseDetailFixture.scaffolding_availability)).toBe("unavailable");
    expect(availabilityOf(qualityCaseDetailFixture.official_evidence)).toBe("empty");
  });
});

describe("partitionImprovements (T13)", () => {
  it("splits strictly by core_focus === true", () => {
    const { core, nonCore, availability } = partitionImprovements(qualityCaseDetailFixture.improvements);
    expect(availability).toBe("present");
    expect(core.map((item) => item.issue_key)).toEqual(["logic_gap", "structure_weak"]);
    expect(nonCore.map((item) => item.issue_key)).toEqual(["length_imbalance"]);
  });

  it("T13: zero CORE items is valid", () => {
    const items: QualityImprovement[] = [
      { issue_key: "a", priority: 1, core_focus: false },
      { issue_key: "b", priority: 2, core_focus: null },
      { issue_key: "c", priority: 3 },
    ];
    const { core, nonCore } = partitionImprovements(items);
    expect(core).toEqual([]);
    expect(nonCore).toHaveLength(3);
  });

  it("does not infer CORE from low priority", () => {
    const items: QualityImprovement[] = [{ issue_key: "a", priority: 1, core_focus: false }];
    expect(partitionImprovements(items).core).toEqual([]);
  });

  it("reports unavailable when the improvements group is null", () => {
    expect(partitionImprovements(null).availability).toBe("unavailable");
    expect(partitionImprovements([]).availability).toBe("empty");
  });
});

describe("rewrite distinction (T16)", () => {
  it("detects a present generated rewrite", () => {
    expect(hasGeneratedRewrite(qualityCaseDetailFixture.generated_rewrite)).toBe(true);
    expect(hasGeneratedRewrite(null)).toBe(false);
    expect(hasGeneratedRewrite({})).toBe(false);
  });

  it("student rewrite attempts are separate from the generated rewrite", () => {
    // The fixture has one non-rewrite attempt, so there are no student rewrites,
    // yet a generated rewrite exists — the two concepts never merge.
    expect(studentRewriteAttempts(qualityCaseDetailFixture.student_attempts)).toEqual([]);
    expect(hasGeneratedRewrite(qualityCaseDetailFixture.generated_rewrite)).toBe(true);

    const withRewrite = studentRewriteAttempts([
      { attempt_id: "a1", attempt_no: 1, is_rewrite: false },
      { attempt_id: "a2", attempt_no: 2, is_rewrite: true },
    ]);
    expect(withRewrite.map((attempt) => attempt.attempt_id)).toEqual(["a2"]);
  });
});

describe("detailGroupAvailability (T12, T15)", () => {
  it("maps each documented group to its availability state", () => {
    const states = detailGroupAvailability(qualityCaseDetailFixture);
    expect(states.answerFullText).toBe("present");
    expect(states.dimensions).toBe("present");
    expect(states.improvements).toBe("present");
    expect(states.sentenceFeedback).toBe("unavailable"); // T15: null, not empty
    expect(states.scaffolding).toBe("unavailable");
    expect(states.officialEvidence).toBe("empty");
    expect(states.generatedRewrite).toBe("present");
    expect(states.provenance).toBe("present");
    expect(states.processing).toBe("present");
  });
});
