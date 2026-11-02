"use client";

/**
 * MATH-5B — minimal, mobile-first learning-guidance UI proving the CORE → L0 → L1 → L2 → solution
 * reveal → re-solve handoff (MATH-5A §55, brief §26). Presentational: it renders canonical facts and
 * raises intents via callbacks. Consumes only client-safe `@/lib/math-learning/*` — no worker client,
 * no provider payloads. Presentation copy is not a canonical evaluation fact.
 */




import {useState} from "react";
import {MathText} from "../math-display/math-text";
import type { CoreView, HintLevel } from "@/lib/math-learning/types";
import type { SolutionProvenance } from "@/lib/math-learning/runtime/contract";

export interface LearningGuidanceProps {
  coreView: CoreView;
  /** L0 body is delivered with the evaluation. */
  l0Body: string;
  /** Bodies of already-revealed L1/L2 hints, keyed by level. */
  revealedHints: Partial<Record<HintLevel, string>>;
  onRevealHint: (level: HintLevel) => void;
  onRevealSolution: () => void;
  onResolve: () => void;
  solutionBody?: string;
  solutionAvailable?: boolean;
  availableHintLevels?: HintLevel[];
  solutionProvenance?: SolutionProvenance | null;
}

export function LearningGuidance({
  coreView,
  l0Body,
  revealedHints,
  onRevealHint,
  onResolve, onRevealSolution, solutionBody, solutionAvailable=false, solutionProvenance, availableHintLevels=[1,2],
}: LearningGuidanceProps) {
  const [confirmSolution,setConfirmSolution]=useState(false);
  if (!coreView.primary) {
    return (
      <section className="math-learning" aria-label="학습 안내">
        <h2>풀이 다시 살펴보기</h2>
        <p>저장된 평가 결과를 확인하고 답안을 다시 작성해 보세요.</p>
        <button type="button" onClick={onResolve}>답안을 다시 작성해 보세요</button>
      </section>
    );
  }

  return (
    <section className="math-learning" aria-label="학습 안내">
      <h2 className="math-learning__core-title">가장 먼저 확인할 부분</h2>
      <p>1단계 · 오류 위치 → 2단계 · 개념 힌트 → 3단계 · 해결 방향 → 4단계 · 수정 풀이 비교</p>
      <p className="math-learning__core">{coreView.primary.title}</p>
      {revealedHints[1]&&<p className="math-learning__why"><MathText text={coreView.primary.why}/></p>}

      <p className="math-learning__l0" data-level="0"><MathText text={l0Body}/></p>

      <div className="math-learning__hints">
        {revealedHints[1] ? (
          <p data-level="1"><MathText text={revealedHints[1]}/></p>
        ) : (
          <button type="button" disabled={!availableHintLevels.includes(1)} onClick={() => onRevealHint(1)}>힌트 보기</button>
        )}
        {revealedHints[1] ? (
          revealedHints[2] ? (
            <p data-level="2"><MathText text={revealedHints[2]}/></p>
          ) : (
            <button type="button" disabled={!availableHintLevels.includes(2)} onClick={() => onRevealHint(2)}>해결 방향 보기</button>
          )
        ) : null}
      </div>

      {revealedHints[2] && solutionAvailable && !solutionBody && <>
        <button type="button" onClick={()=>setConfirmSolution(true)}>수정 풀이 비교 준비</button>
        {confirmSolution && <div role="group" aria-label="참고 풀이 공개 확인"><p>먼저 직접 수정해 보세요. 참고 풀이를 열면 학습 이력에 공개 사실이 기록됩니다.</p><button type="button" onClick={onRevealSolution}>참고 풀이 확인</button></div>}
      </>}
      {solutionBody && <details><summary>수정 풀이 비교 · {solutionProvenance==='AI_GENERATED_REFERENCE'?'AI 생성 참고 풀이':solutionProvenance==='OFFICIAL_SOLUTION'?'공식 해설':'검수된 참고 풀이'}</summary><MathText text={solutionBody}/></details>}
      <button type="button" className="math-learning__resolve" onClick={onResolve}>
        답안을 다시 작성해 보세요
      </button>
    </section>
  );
}
