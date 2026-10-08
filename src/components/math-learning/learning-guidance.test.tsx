// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LearningGuidance } from "./learning-guidance";
import { buildCoreView } from "@/lib/math-learning/core";
import { outputWithCore } from "@/lib/math-learning/fixtures";
import { baseOutput } from "@/lib/math-eval/fixtures";

describe("LearningGuidance", () => {
  it("shows CORE + L0 and requests progressive hints, then re-solve", () => {
    const onRevealHint = vi.fn();
    const onResolve = vi.fn();
    render(
      <LearningGuidance
        coreView={buildCoreView(outputWithCore())}
        l0Body="3단계의 부호 처리를 다시 확인해 보세요."
        revealedHints={{}}
        onRevealHint={onRevealHint}
        onRevealSolution={() => {}}
        onResolve={onResolve}
      />,
    );
    expect(screen.getByText("가장 먼저 확인할 부분")).toBeInTheDocument();
    expect(screen.getByText(/부호 처리를 다시 확인/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "힌트 보기" }));
    expect(onRevealHint).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: "답안을 다시 작성해 보세요" }));
    expect(onResolve).toHaveBeenCalled();
  });

  it("requires an explicit second click (learning notice) before revealing the solution", () => {
    const onRevealSolution = vi.fn();
    render(
      <LearningGuidance
        coreView={buildCoreView(outputWithCore())}
        l0Body="x"
        revealedHints={{ 1: "방향 힌트" }}
        onRevealHint={() => {}}
        onRevealSolution={onRevealSolution}
        onResolve={() => {}}
        solutionProvenance="AI_GENERATED_REFERENCE"
      />,
    );
    const button = screen.getByRole("button", { name: "해설 보기" });
    fireEvent.click(button); // shows notice first (no hard lock, but a nudge)
    expect(onRevealSolution).not.toHaveBeenCalled();
    expect(screen.getByText(/학습 효과/)).toBeInTheDocument();
    fireEvent.click(button);
    expect(onRevealSolution).toHaveBeenCalled();
    expect(screen.getByText("AI 참고 풀이")).toBeInTheDocument();
  });

  it("renders a completion state when CORE is empty", () => {
    render(
      <LearningGuidance
        coreView={buildCoreView(baseOutput({ core: [] }))}
        l0Body=""
        revealedHints={{}}
        onRevealHint={() => {}}
        onRevealSolution={() => {}}
        onResolve={() => {}}
      />,
    );
    expect(screen.getByText("잘 해결했습니다")).toBeInTheDocument();
  });
});
