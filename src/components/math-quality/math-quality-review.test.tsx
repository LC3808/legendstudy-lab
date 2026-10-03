// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MathQualityReview } from "./math-quality-review";
import { caseDetailFixture } from "@/lib/math-quality/fixtures";
import { deriveReviewState } from "@/lib/math-quality/review-state";
import type { HqJudgmentRecord } from "@/lib/math-quality/types";

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

describe("MathQualityReview", () => {
  it("states it reviews AI quality, not the student", () => {
    render(<MathQualityReview detail={caseDetailFixture()} reviewState={deriveReviewState([])} judgments={[]} />);
    expect(screen.getByText(/학생 답안을 다시 채점하지 않습니다/)).toBeInTheDocument();
  });

  it("preserves and surfaces reviewer disagreement (not averaged)", () => {
    const judgments = [
      record({ judgment_id: "a", reviewer_display: "reviewer:a", overall_disposition: "PASS_WITH_NOTES" }),
      record({ judgment_id: "b", reviewer_display: "reviewer:b", overall_disposition: "FAIL" }),
    ];
    render(<MathQualityReview detail={caseDetailFixture()} reviewState={deriveReviewState(judgments)} judgments={judgments} />);
    expect(screen.getByText(/검토자 의견 불일치/)).toBeInTheDocument();
    expect(screen.getByText("활성 판정: PASS_WITH_NOTES, FAIL")).toBeInTheDocument();
  });

  it("renders a deleted reviewer as 삭제된 검토자 (E2)", () => {
    const judgments = [record({ reviewer_display: null })];
    render(<MathQualityReview detail={caseDetailFixture()} reviewState={deriveReviewState(judgments)} judgments={judgments} />);
    expect(screen.getByText(/삭제된 검토자/)).toBeInTheDocument();
  });
});
