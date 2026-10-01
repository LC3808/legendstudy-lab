"use client";

import type { HqJudgment } from "@/lib/quality/human-review-contract";
import {
  DISPOSITION_LABELS,
  ISSUE_CATEGORY_LABELS,
  reviewerLabel,
  SEVERITY_LABELS,
  VERDICT_LABELS,
} from "@/lib/quality/human-review-view";
import type { HqDisposition, HqIssueCategory, HqSeverity, HqVerdict } from "@/lib/quality/human-review-contract";

/** Human Review history. Shows independent and superseded judgments; never only the latest. */
export function QualityReviewHistory({
  judgments,
  onCorrect,
  hasMore,
  onLoadMore,
  loadingMore,
}: {
  judgments: HqJudgment[];
  onCorrect: (judgmentId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  if (judgments.length === 0) {
    return <p className="ql-state ql-state--empty" data-availability="empty">아직 기록된 인간 검토가 없습니다 (미검토).</p>;
  }
  return (
    <div className="ql-review-history">
      <ol className="ql-review-history__list">
        {judgments.map((j) => {
          const active = j.is_active !== false;
          const disposition = (j.overall_disposition ?? "") as HqDisposition;
          return (
            <li key={j.id} className={`ql-review-item${active ? "" : " ql-review-item--superseded"}`} data-testid="ql-review-item">
              <div className="ql-review-item__head">
                <span className={`ql-chip ql-disposition ql-disposition--${disposition}`}>{DISPOSITION_LABELS[disposition] ?? j.overall_disposition ?? "—"}</span>
                <span className="ql-review-item__who">{reviewerLabel(j)}</span>
                <span className="ql-muted">{formatTime(j.created_at)}</span>
                {!active ? <span className="ql-chip ql-chip--warn">정정됨(이력)</span> : null}
                {j.supersedes_judgment_id ? <span className="ql-chip">정정 기록</span> : <span className="ql-chip">독립 검토</span>}
                <span className="ql-muted">{j.rubric_version}</span>
              </div>

              <div className="ql-review-item__verdicts">
                {Object.entries(j.rubric_result ?? {}).map(([dim, verdict]) => (
                  <span key={dim} className="ql-verdict-chip" title={dim}>
                    {dim}: {VERDICT_LABELS[(verdict ?? "") as HqVerdict] ?? verdict}
                  </span>
                ))}
              </div>

              {Array.isArray(j.findings) && j.findings.length > 0 ? (
                <ul className="ql-review-item__findings">
                  {j.findings.map((f, i) => (
                    <li key={f.id ?? i}>
                      <span className="ql-chip">{ISSUE_CATEGORY_LABELS[(f.issue_category ?? "") as HqIssueCategory] ?? f.issue_category}</span>
                      <span className="ql-chip ql-chip--sev">{SEVERITY_LABELS[(f.severity ?? "") as HqSeverity] ?? f.severity}</span>
                      <span className="ql-muted">{f.target_kind}</span>
                      {f.note ? <span>· {f.note}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {j.summary_note ? <p className="ql-review-item__note">메모: {j.summary_note}</p> : null}
              {j.recommended_action && j.recommended_action !== "NONE" ? (
                <p className="ql-muted">권고(비실행): {j.recommended_action}</p>
              ) : null}

              {active ? (
                <button type="button" className="button button--outline button--small" onClick={() => onCorrect(j.id)}>이 검토 정정</button>
              ) : null}
            </li>
          );
        })}
      </ol>
      {hasMore ? (
        <button type="button" className="button button--outline button--small" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? "불러오는 중" : "이전 기록 더 보기"}
        </button>
      ) : null}
    </div>
  );
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}
