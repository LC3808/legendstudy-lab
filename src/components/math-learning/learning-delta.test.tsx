// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LearningDelta } from "./learning-delta";
import { LearningHistory } from "./learning-history";
import { summarizeReevaluationDelta } from "@/lib/math-learning/delta";
import { buildLearningTimeline } from "@/lib/math-learning/history";
import { historyEntryFixture, reevaluationDeltaFixture } from "@/lib/math-learning/fixtures";
import { includedReevaluation } from "@/lib/math-learning/runtime/mock-learning-server";

describe("LearningDelta", () => {
  it("shows resolved + new root + not-reassessed with text labels", () => {
    const view = summarizeReevaluationDelta(
      reevaluationDeltaFixture({
        downstream: "NOT_REASSESSED",
        delta: [
          { kind: "ROOT_ERROR_REMOVED", explanation: "부호 오류 해결됨" },
          { kind: "NEW_INDEPENDENT_ERROR", explanation: "새 오류 발견" },
        ],
      }),
    );
    render(<LearningDelta view={view} />);
    expect(screen.getByText("무엇이 달라졌나요?")).toBeInTheDocument();
    expect(screen.getByText("부호 오류 해결됨")).toBeInTheDocument();
    expect(screen.getByText("새 오류 발견")).toBeInTheDocument();
    expect(screen.getByText(/재평가하지 않았습니다/)).toBeInTheDocument();
  });

  it("shows a factual no-material-change message", () => {
    const view = summarizeReevaluationDelta(reevaluationDeltaFixture({ delta: [{ kind: "NO_MATERIAL_CHANGE", explanation: "x" }] }));
    render(<LearningDelta view={view} />);
    expect(screen.getByText(/달라진 부분은 확인되지 않았습니다/)).toBeInTheDocument();
  });
});

describe("LearningHistory", () => {
  it("renders multiple attempts oldest-first and the included note when AVAILABLE", () => {
    const timeline = buildLearningTimeline({
      lineage_id: "lin-1",
      attempts: [
        historyEntryFixture({ attempt_id: "a2", created_at: "2026-10-03T00:00:00.000Z", resolve_kind: "FULL_RESOLVE" }),
        historyEntryFixture({ attempt_id: "a1", created_at: "2026-10-02T00:00:00.000Z", resolve_kind: "INITIAL" }),
      ],
      included_reevaluation: includedReevaluation(),
      next_cursor: null,
    });
    render(<LearningHistory timeline={timeline} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("최초 답안");
    expect(screen.getByText(/Credit이 추가로 차감되지 않습니다/)).toBeInTheDocument();
  });

  it("does not show the free-reeval note when not AVAILABLE", () => {
    const timeline = buildLearningTimeline({
      lineage_id: "lin-1",
      attempts: [historyEntryFixture()],
      included_reevaluation: includedReevaluation({ status: "EXPIRED", eligible: false }),
      next_cursor: null,
    });
    render(<LearningHistory timeline={timeline} />);
    expect(screen.queryByText(/추가로 차감되지 않습니다/)).toBeNull();
  });
});
