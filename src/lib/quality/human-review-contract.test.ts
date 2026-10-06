import { describe, expect, it } from "vitest";

import { parseJudgmentPage, parseReviewState, parseSubmitResult } from "./human-review-contract";
import { isHumanReviewError } from "./human-review-errors";
import { hqJudgmentPageFixture, hqReviewStateFixture, hqSubmitResultFixture } from "./human-review-fixtures";

describe("ql_review_state parsing", () => {
  it("parses availability + state rows", () => {
    const rows = parseReviewState(hqReviewStateFixture);
    expect(rows).toHaveLength(4);
    expect(rows[0].human_review_state).toBe("REVIEWED_WITH_CONCERNS");
    expect(rows[1].human_review_state).toBe("UNREVIEWED");
    expect(rows[2].human_review_state).toBe("DISAGREEMENT");
    expect(rows[3].availability).toBe("NOT_FOUND");
  });

  it("fails closed on unsupported hq-read dto_version", () => {
    const bad = { ...hqReviewStateFixture, dto_version: "hq-read-v9" };
    try {
      parseReviewState(bad);
      throw new Error("should have thrown");
    } catch (error) {
      expect(isHumanReviewError(error) && error.kind).toBe("UNSUPPORTED_RUBRIC");
    }
  });

  it("rejects malformed cases array", () => {
    try {
      parseReviewState({ dto_version: "hq-read-v1", cases: {} });
      throw new Error("should have thrown");
    } catch (error) {
      expect(isHumanReviewError(error) && error.kind).toBe("MALFORMED_RESPONSE");
    }
  });
});

describe("ql_list_human_judgments parsing", () => {
  it("parses judgments incl. superseded + deleted reviewer", () => {
    const page = parseJudgmentPage(hqJudgmentPageFixture);
    expect(page.judgments).toHaveLength(2);
    expect(page.judgments[0].is_active).toBe(true);
    expect(page.judgments[1].is_active).toBe(false);
    expect(page.judgments[1].reviewer_state).toBe("DELETED_OR_UNAVAILABLE");
    expect(page.nextCursor).toBeNull();
  });

  it("parses a paired next_cursor", () => {
    const withCursor = { ...hqJudgmentPageFixture, next_cursor: { created_at: "2026-10-01T04:30:00.000Z", judgment_id: "x" } };
    const page = parseJudgmentPage(withCursor);
    expect(page.nextCursor).toEqual({ created_at: "2026-10-01T04:30:00.000Z", judgment_id: "x" });
  });

  it("rejects an unpaired cursor", () => {
    const bad = { ...hqJudgmentPageFixture, next_cursor: { created_at: "2026-10-01T04:30:00.000Z" } };
    try {
      parseJudgmentPage(bad);
      throw new Error("should have thrown");
    } catch (error) {
      expect(isHumanReviewError(error) && error.kind).toBe("MALFORMED_RESPONSE");
    }
  });
});

describe("submit result parsing", () => {
  it("parses judgment id + replayed", () => {
    const result = parseSubmitResult(hqSubmitResultFixture);
    expect(result.judgmentId).toBe("jjjjjjj3-0000-0000-0000-000000000003");
    expect(result.replayed).toBe(false);
  });

  it("rejects a result without judgment_id", () => {
    try {
      parseSubmitResult({ dto_version: "hq-write-v1" });
      throw new Error("should have thrown");
    } catch (error) {
      expect(isHumanReviewError(error) && error.kind).toBe("MALFORMED_RESPONSE");
    }
  });
});
