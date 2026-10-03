"use client";

/**
 * MATH-7B — minimal Math Quality reviewer workspace. Renders Math-typed evidence + review state; it is
 * NOT the sentence-centric Humanities UI. Presentational; client-safe (no privileged role key, no worker).
 *
 * Core principle made explicit in the UI: Human Quality reviews the AI evaluation's quality, not the
 * student — HQ PASS ≠ student correct, HQ FAIL ≠ student wrong.
 */

import type { ReviewStateProjection } from "@/lib/math-quality/review-state";
import type { HqJudgmentRecord, MathQualityCaseDetail } from "@/lib/math-quality/types";

const REVIEW_STATE_LABEL: Record<string, string> = {
  UNREVIEWED: "미검토",
  SINGLE_REVIEW: "검토 1건",
  MULTIPLE_REVIEWS: "검토 여러 건",
  CORRECTED: "정정됨",
  DISAGREEMENT: "검토자 의견 불일치",
  NOT_COMPARABLE: "비교 불가(버전 상이)",
};

export interface MathQualityReviewProps {
  detail: MathQualityCaseDetail;
  reviewState: ReviewStateProjection;
  judgments: HqJudgmentRecord[];
}

export function MathQualityReview({ detail, reviewState, judgments }: MathQualityReviewProps) {
  return (
    <section className="math-quality-review" aria-label="AI 평가 품질 검수">
      <h2>AI 평가 품질 검수</h2>
      <p className="math-quality-review__principle" role="note">
        이 검수는 AI 평가의 품질을 확인합니다. 학생 답안을 다시 채점하지 않습니다. (PASS가 학생 정답을,
        FAIL이 학생 오답을 뜻하지 않습니다.)
      </p>

      <dl className="math-quality-review__evidence">
        <dt>문항 형식</dt>
        <dd>{detail.response_format}</dd>
        <dt>풀이 단계</dt>
        <dd>{detail.solution_step_ids.length}개</dd>
        <dt>핵심 오류</dt>
        <dd>{detail.root_error_ids.length}개</dd>
        <dt>추출 영역</dt>
        <dd>{detail.extraction_region_ids.length}개</dd>
        <dt>대안 풀이(참조/학생)</dt>
        <dd>
          {detail.reference_path_ids.length} / {detail.student_path_ids.length}
        </dd>
        <dt>힌트 / 생성 풀이</dt>
        <dd>
          {detail.has_hints ? "있음" : "없음"} / {detail.has_generated_solution ? "있음" : "없음"}
        </dd>
      </dl>

      <p className="math-quality-review__state" data-state={reviewState.state}>
        검토 상태: {REVIEW_STATE_LABEL[reviewState.state] ?? reviewState.state}
      </p>
      {reviewState.state === "DISAGREEMENT" ? (
        <p className="math-quality-review__disagreement">
          활성 판정: {reviewState.activeDispositions.join(", ")}
        </p>
      ) : null}

      <ul className="math-quality-review__judgments">
        {judgments.map((j) => (
          <li key={j.judgment_id} data-superseded={j.superseded}>
            {j.reviewer_display ?? "삭제된 검토자"} · {j.overall_disposition}
            {j.superseded ? " (정정됨)" : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
