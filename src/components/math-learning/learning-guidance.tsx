"use client";

/**
 * MATH-5B — minimal, mobile-first learning-guidance UI proving the CORE → L0 → L1 → L2 → solution
 * reveal → re-solve handoff (MATH-5A §55, brief §26). Presentational: it renders canonical facts and
 * raises intents via callbacks. Consumes only client-safe `@/lib/math-learning/*` — no worker client,
 * no provider payloads. Presentation copy is not a canonical evaluation fact.
 */




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
  solutionProvenance?: SolutionProvenance | null;
}

export function LearningGuidance({
  coreView,
  l0Body,
  revealedHints,
  onRevealHint,
  onResolve,
}: LearningGuidanceProps) {
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
      <p className="math-learning__core">{coreView.primary.title}</p>
      <p className="math-learning__why">{coreView.primary.why}</p>

      <p className="math-learning__l0" data-level="0">{l0Body}</p>

      <div className="math-learning__hints">
        {revealedHints[1] ? (
          <p data-level="1">{revealedHints[1]}</p>
        ) : (
          <button type="button" onClick={() => onRevealHint(1)}>힌트 보기</button>
        )}
        {revealedHints[1] ? (
          revealedHints[2] ? (
            <p data-level="2">{revealedHints[2]}</p>
          ) : (
            <button type="button" onClick={() => onRevealHint(2)}>개념 힌트 더 보기</button>
          )
        ) : null}
      </div>

      <button type="button" className="math-learning__resolve" onClick={onResolve}>
        답안을 다시 작성해 보세요
      </button>
    </section>
  );
}
