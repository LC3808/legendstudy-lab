"use client";

import type { QualityCaseSummary } from "@/lib/quality/contract";
import type { QualityErrorKind } from "@/lib/quality/errors";
import type { HqCaseReviewState, HqReviewState } from "@/lib/quality/human-review-contract";
import { reviewStateLabel } from "@/lib/quality/human-review-view";

/**
 * Case list panel. Renders ONLY compact list fields — never any student answer
 * body (the list contract carries none; the detail RPC is the only answer source).
 * Human review state (if provided) is shown as a badge from the canonical
 * `ql_review_state` projection — never inferred from ql-read-v1 fields.
 */

export type ListState = "idle" | "loading" | "loaded" | "error";

function reviewBadgeClass(state: HqReviewState | null | undefined): string {
  switch (state) {
    case "REVIEWED_ACCEPTABLE":
      return "ql-review-badge--ok";
    case "REVIEWED_WITH_CONCERNS":
      return "ql-review-badge--concern";
    case "REVIEWED_FAILED":
      return "ql-review-badge--fail";
    case "DISAGREEMENT":
    case "MULTIPLE_REVIEWS":
      return "ql-review-badge--multi";
    default:
      return "ql-review-badge--unreviewed";
  }
}

function fmtTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

function errorCopy(kind: QualityErrorKind | null): string {
  switch (kind) {
    case "UNAUTHORIZED":
      return "이 목록을 조회할 권한이 없습니다.";
    case "NETWORK":
      return "네트워크 오류로 목록을 불러오지 못했습니다.";
    case "MALFORMED_RESPONSE":
      return "응답 형식이 예상과 달라 안전하게 중단했습니다.";
    case "UNSUPPORTED_DTO":
      return "지원하지 않는 contract 버전입니다. 목록을 표시하지 않습니다.";
    default:
      return "목록을 불러오는 중 오류가 발생했습니다.";
  }
}

export function QualityCaseList({
  cases,
  state,
  errorKind,
  selectedId,
  hasMore,
  loadingMore,
  onSelect,
  onLoadMore,
  onRefresh,
  reviewStates,
  unreviewedOnly = false,
  onToggleUnreviewed,
  onNextUnreviewed,
}: {
  cases: QualityCaseSummary[];
  state: ListState;
  errorKind: QualityErrorKind | null;
  selectedId: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onSelect: (evaluationId: string) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  reviewStates?: Map<string, HqCaseReviewState>;
  unreviewedOnly?: boolean;
  onToggleUnreviewed?: () => void;
  onNextUnreviewed?: () => void;
}) {
  return (
    <div className="ql-list" aria-label="평가 사례 목록">
      <div className="ql-list__head">
        <p className="eyebrow">QUALITY CASES</p>
        <button type="button" className="button button--outline button--small" onClick={onRefresh} disabled={state === "loading"}>
          {state === "loading" ? "불러오는 중" : "새로고침"}
        </button>
      </div>

      {onToggleUnreviewed || onNextUnreviewed ? (
        <div className="ql-list__filters">
          {onToggleUnreviewed ? (
            <label className="ql-checkbox ql-checkbox--inline">
              <input type="checkbox" checked={unreviewedOnly} onChange={onToggleUnreviewed} />
              <span>미검토만 (불러온 범위)</span>
            </label>
          ) : null}
          {onNextUnreviewed ? (
            <button type="button" className="button button--outline button--small" onClick={onNextUnreviewed}>다음 미검토 →</button>
          ) : null}
        </div>
      ) : null}

      {state === "loading" && cases.length === 0 ? (
        <p className="ql-state" aria-live="polite">목록을 불러오는 중입니다.</p>
      ) : null}

      {state === "error" ? (
        <div className="ql-callout ql-callout--error" role="alert">
          <p>{errorCopy(errorKind)}</p>
          <button type="button" className="button button--outline button--small" onClick={onRefresh}>다시 시도</button>
        </div>
      ) : null}

      {state === "loaded" && cases.length === 0 ? (
        <div className="ql-state ql-state--empty" data-availability="empty">
          <p>검토할 논술 평가가 아직 없습니다.</p>
          <small>실제 평가 사례가 생성되면 최신순으로 이곳에 표시됩니다.</small>
        </div>
      ) : null}

      {cases.length > 0 ? (
        <ul className="ql-list__items">
          {cases.map((item) => {
            const selected = item.evaluation_id === selectedId;
            const review = reviewStates?.get(item.evaluation_id);
            const reviewState = review?.availability === "AVAILABLE" ? (review.human_review_state ?? null) : null;
            return (
              <li key={item.evaluation_id}>
                <button
                  type="button"
                  className={`ql-case${selected ? " ql-case--selected" : ""}`}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => onSelect(item.evaluation_id)}
                >
                  <span className="ql-case__top">
                    {review ? (
                      <span className={`ql-review-badge ${reviewBadgeClass(reviewState)}`}>
                        {reviewStateLabel(reviewState)}
                        {review.has_material_issue ? " ·!" : ""}
                      </span>
                    ) : null}
                    <span className="ql-case__univ">{item.university_name ?? "대학 미상"}</span>
                    {item.status ? <span className="ql-chip">{item.status}</span> : null}
                    {item.invalidated_at ? <span className="ql-chip ql-chip--warn">무효화됨</span> : null}
                  </span>
                  <span className="ql-case__q">
                    {(item.exam_name ?? "") + (item.question_label ? ` · ${item.question_label}` : "")}
                    {item.admission_year ? ` · ${item.admission_year}` : ""}
                  </span>
                  <span className="ql-case__meta">
                    <span>요청 {fmtTime(item.requested_at)}</span>
                    {typeof item.core_count === "number" ? <span>CORE {item.core_count}</span> : null}
                    {item.has_generated_rewrite ? <span>AI 재작성</span> : null}
                    {item.has_subsequent_student_attempt ? <span>학생 재작성</span> : null}
                    {item.processing_outcome ? <span>{item.processing_outcome}</span> : null}
                  </span>
                  <span className="ql-case__pseudonym">학생 {item.student_pseudonym ?? "—"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {hasMore ? (
        <button type="button" className="button button--outline button--small ql-list__more" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? "불러오는 중" : "다음 페이지"}
        </button>
      ) : null}
    </div>
  );
}
