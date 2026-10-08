"use client";

/**
 * MATH-6B — append-only learning-history timeline (학습 기록). Oldest-first; supports more than two
 * attempts. No UUIDs/leases/billing internals shown. Status text, not color alone. Client-safe.
 */

import { resolveCtaNote } from "@/lib/math-learning/handoff";
import type { LearningTimeline } from "@/lib/math-learning/history";

const KIND_LABEL: Record<string, string> = {
  INITIAL: "최초 답안",
  FULL_RESOLVE: "전체 재작성",
  STEP_RETRY: "부분 재작성",
  SHORT_ANSWER_RESOLVE: "답 재작성",
};

export interface LearningHistoryProps {
  timeline: LearningTimeline;
}

export function LearningHistory({ timeline }: LearningHistoryProps) {
  const note = resolveCtaNote(timeline.included.status);
  return (
    <section className="learning-history" aria-label="학습 기록">
      <h2>학습 기록</h2>
      <ol className="learning-history__list">
        {timeline.attempts.map((attempt) => (
          <li key={attempt.attemptId} className="learning-history__item" data-ordinal={attempt.ordinal}>
            <h3>
              {attempt.ordinal}. {KIND_LABEL[attempt.resolveKind] ?? attempt.resolveKind}
            </h3>
            <p className="learning-history__state">{attempt.evaluationState ?? "평가 대기"}</p>
            {attempt.coreCount > 0 ? <p>핵심 개선 목표 {attempt.coreCount}개</p> : <p>핵심 오류 없음</p>}
            {attempt.exposedHintLevels.length > 0 ? (
              <p className="learning-history__hints">힌트 확인: {attempt.exposedHintLevels.join(", ")}단계</p>
            ) : null}
            {attempt.referenceSolutionRevealedBeforeResolve ? <p>재작성 전 해설 확인</p> : null}
            {attempt.notReassessed ? <p data-kind="not-reassessed">일부는 재평가하지 않음</p> : null}
          </li>
        ))}
      </ol>
      {note ? <p className="learning-history__included">{note}</p> : null}
    </section>
  );
}
