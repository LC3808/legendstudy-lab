"use client";

/**
 * MATH-6B — reevaluation learning-delta view ("무엇이 달라졌나"). Presentational over canonical delta
 * facts; no numeric score. Status is conveyed with text labels (not color alone). Client-safe.
 */

import type { LearningDeltaView } from "@/lib/math-learning/delta";

export interface LearningDeltaProps {
  view: LearningDeltaView | null;
}

export function LearningDelta({ view }: LearningDeltaProps) {
  if (!view) {
    return (
      <section className="learning-delta" aria-label="재첨삭 결과">
        <p>재첨삭 결과가 아직 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="learning-delta" aria-label="재첨삭 결과">
      <h2>무엇이 달라졌나요?</h2>

      {view.noMaterialChange ? (
        <p className="learning-delta__none" data-kind="no-material-change">
          핵심적으로 달라진 부분은 확인되지 않았습니다.
        </p>
      ) : null}

      {view.resolved.length > 0 ? (
        <div className="learning-delta__resolved" data-kind="resolved">
          <h3>해결된 부분</h3>
          <ul>
            {view.resolved.map((item, i) => (
              <li key={`r-${i}`}>{item.explanation}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {view.newIssues.length > 0 ? (
        <div className="learning-delta__new" data-kind="new-issue">
          <h3>새롭게 확인된 핵심 오류</h3>
          <ul>
            {view.newIssues.map((item, i) => (
              <li key={`n-${i}`}>{item.explanation}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {view.persisting.length > 0 ? (
        <div className="learning-delta__persisting" data-kind="persisting">
          <h3>아직 남은 핵심 오류</h3>
          <ul>
            {view.persisting.map((item, i) => (
              <li key={`p-${i}`}>{item.explanation}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {view.notReassessed ? (
        <p className="learning-delta__not-reassessed" data-kind="not-reassessed">
          이번 답안에서 다시 작성하지 않은 부분은 재평가하지 않았습니다.
        </p>
      ) : null}
    </section>
  );
}
