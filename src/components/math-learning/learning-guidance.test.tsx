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
    expect(screen.queryByRole("button",{name:"해설 보기"})).toBeNull();
    expect(onRevealSolution).not.toHaveBeenCalled();
    expect(screen.queryByText("참고 풀이")).toBeNull();
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
    expect(screen.getByText("풀이 다시 살펴보기")).toBeInTheDocument();
  });
});

it('gates solution behind both hints and explicit confirmation, then keeps it collapsed',()=>{
 const reveal=vi.fn();const props={coreView:buildCoreView(outputWithCore()),l0Body:'오류 위치',revealedHints:{1:'개념',2:'방향'},onRevealHint:vi.fn(),onRevealSolution:reveal,onResolve:vi.fn(),solutionAvailable:true};
 const {rerender}=render(<LearningGuidance {...props}/>);
 expect(screen.queryByText('참고 풀이 확인')).toBeNull();
 fireEvent.click(screen.getByText('수정 풀이 비교 준비'));expect(reveal).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('참고 풀이 확인'));expect(reveal).toHaveBeenCalledTimes(1);
 rerender(<LearningGuidance {...props} solutionBody="전체 참고 풀이" solutionProvenance="AI_GENERATED_REFERENCE"/>);
 expect(screen.getByText('전체 참고 풀이').closest('details')).not.toHaveAttribute('open');
});
