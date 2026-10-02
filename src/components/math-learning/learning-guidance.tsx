"use client";

/**
 * MATH-5B — minimal, mobile-first learning-guidance UI proving the CORE → L0 → L1 → L2 → solution
 * reveal → re-solve handoff (MATH-5A §55, brief §26). Presentational: it renders canonical facts and
 * raises intents via callbacks. Consumes only client-safe `@/lib/math-learning/*` — no worker client,
 * no provider payloads. Presentation copy is not a canonical evaluation fact.
 */

import { useState } from "react";

import { referenceLabel } from "@/lib/math-learning/core";
import type { CoreView, HintLevel, ReferenceProvenanceLabel } from "@/lib/math-learning/types";
import type { ReferenceProvenance } from "@/lib/math-eval/types";

export interface LearningGuidanceProps {
  coreView: CoreView;
  /** L0 body is delivered with the evaluation. */
  l0Body: string;
  /** Bodies of already-revealed L1/L2 hints, keyed by level. */
  revealedHints: Partial<Record<HintLevel, string>>;
  onRevealHint: (level: HintLevel) => void;
  onRevealSolution: () => void;
  onResolve: () => void;
  solutionProvenance?: ReferenceProvenance | null;
}

export function LearningGuidance({
  coreView,
  l0Body,
  revealedHints,
  onRevealHint,
  onRevealSolution,
  onResolve,
  solutionProvenance,
}: LearningGuidanceProps) {
  const [noticeShown, setNoticeShown] = useState(false);
  const label: ReferenceProvenanceLabel | null = solutionProvenance ? referenceLabel(solutionProvenance) : null;

  if (!coreView.primary) {
    return (
      <section className="math-learning" aria-label="학습 안내">
        <h2>잘 해결했습니다</h2>
        <p>이 문항에서 더 고칠 핵심 오류는 없습니다.</p>
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

      <div className="math-learning__solution">
        {noticeShown ? (
          <p className="math-learning__notice">직접 다시 풀어본 뒤 해설을 확인하면 학습 효과가 큽니다.</p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (!noticeShown) {
              setNoticeShown(true);
              return;
            }
            onRevealSolution();
          }}
        >
          해설 보기
        </button>
        {label ? <span className="math-learning__provenance">{label.label}</span> : null}
      </div>

      <button type="button" className="math-learning__resolve" onClick={onResolve}>
        답안을 다시 작성해 보세요
      </button>
    </section>
  );
}
