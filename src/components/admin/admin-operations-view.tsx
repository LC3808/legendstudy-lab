"use client";

import { useState } from "react";

import type { OpsItem, OpsOverview, OpsPage } from "@/lib/admin/contract";
import { formatDateTime, formatNumber } from "@/lib/admin/format";
import {
  formatProcessing,
  humanDispositionLabel,
  humanReviewStateLabel,
  opsBillingLabel,
  opsModelLabel,
  opsOutcomeLabel,
  opsProductLabel,
  opsRequestKindLabel,
  opsStatusLabel,
  opsUnavailableLabel,
} from "@/lib/admin/ops-format";
import { mathRuntimeLabel } from "@/lib/admin/ops-runtime";

import { AdminEmpty, AdminErrorPanel, AdminLoading, useAdminQuery } from "./admin-surface";

const ESSAY_STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "requested", label: "요청됨" },
  { value: "processing", label: "처리 중" },
  { value: "completed", label: "완료" },
  { value: "failed", label: "실패" },
  { value: "cancelled", label: "취소" },
] as const;

/**
 * 논술·수리 운영 (ADMIN-P0-C).
 *
 * How the evaluation pipeline is actually behaving: what was requested, whether
 * it succeeded, how long it took, on which model and prompt, what it cost, and
 * whether a human has judged the quality.
 *
 * Two things are deliberately absent. There is no answer text — reading a
 * student's essay is a different, separately authorized act — and there is no
 * per-row action. This surface reports; it does not retry, refund or invalidate.
 *
 * The 수리논술 (Math) section is present and honest rather than hidden: when the
 * runtime is not deployed the section says so instead of showing an empty list,
 * because "0건" would tell an operator that nothing had ever been requested.
 */
export function AdminOperationsView() {
  const [status, setStatus] = useState("");
  const [essayCursor, setEssayCursor] = useState<string | null>(null);
  const [essayPages, setEssayPages] = useState<OpsItem[]>([]);

  const overview = useAdminQuery<OpsOverview>((client) => client.operationsSummary(), "ops:overview");
  const essay = useAdminQuery<OpsPage>(
    (client) => client.essayOperations({ status: status || null, before: essayCursor, limit: 25 }),
    `ops:essay:${status}:${essayCursor ?? ""}`,
  );
  const math = useAdminQuery<OpsPage>((client) => client.mathOperations({ limit: 25 }), "ops:math");

  function changeStatus(next: string) {
    setStatus(next);
    setEssayCursor(null);
    setEssayPages([]);
  }

  const essayReady = essay.state.status === "ready" ? essay.state.data : null;
  const essayFirstPage = essayReady ? essayReady.items : [];
  const essayRows = [...essayPages, ...essayFirstPage];
  const essayCursorNext =
    essayRows.length > 0 ? essayRows[essayRows.length - 1].requestedAt : null;

  return (
    <div className="admin-stack">
      {overview.state.status === "loading" ? (
        <AdminLoading label="운영 현황을 불러오는 중입니다" />
      ) : overview.state.status === "error" ? (
        <AdminErrorPanel kind={overview.state.kind} onRetry={overview.reload} />
      ) : (
        <section className="admin-section">
          <h2>운영 상태</h2>
          <div className="admin-metrics">
            <div className="admin-metric">
              <p className="admin-metric__label">인문논술</p>
              <p className="admin-metric__value">
                {overview.state.data.essay.available ? "운영 중" : "사용 불가"}
              </p>
              <p className="admin-metric__note">
                {overview.state.data.essay.available
                  ? `전체 ${formatNumber(overview.state.data.essay.summary?.total ?? 0)}건`
                  : opsUnavailableLabel(overview.state.data.essay.reason)}
              </p>
            </div>
            <div className="admin-metric">
              <p className="admin-metric__label">수리논술</p>
              <p className="admin-metric__value">
                {overview.state.data.math.available ? "운영 중" : "사용 불가"}
              </p>
              <p className="admin-metric__note">{mathRuntimeLabel()}</p>
              <p className="admin-metric__note">
                {overview.state.data.math.available
                  ? `전체 ${formatNumber(overview.state.data.math.summary?.total ?? 0)}건`
                  : opsUnavailableLabel(overview.state.data.math.reason)}
              </p>
            </div>
            <div className="admin-metric">
              <p className="admin-metric__label">사람 검토</p>
              <p className="admin-metric__value">
                {overview.state.data.humanReviewTracked
                  ? formatNumber(overview.state.data.humanReviewedCases ?? 0)
                  : "추적 안 됨"}
              </p>
              <p className="admin-metric__note">
                {overview.state.data.humanReviewTracked
                  ? "검토된 평가 건수"
                  : "품질 판정 데이터가 배포되지 않았습니다"}
              </p>
            </div>
          </div>
          <p className="admin-section__note">
            기준 시각 {formatDateTime(overview.state.data.asOf)}
          </p>
        </section>
      )}

      <section className="admin-section">
        <h2>인문논술 평가</h2>
        <div className="admin-search__filters">
          <label className="admin-search__label" htmlFor="admin-ops-status">
            처리 상태
          </label>
          <select
            id="admin-ops-status"
            className="admin-search__input"
            value={status}
            onChange={(event) => changeStatus(event.target.value)}
          >
            {ESSAY_STATUS_FILTERS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {essay.state.status === "loading" ? (
          <AdminLoading label="평가 이력을 불러오는 중입니다" />
        ) : essay.state.status === "error" ? (
          <AdminErrorPanel kind={essay.state.kind} onRetry={essay.reload} />
        ) : !essay.state.data.available ? (
          <AdminEmpty
            title="인문논술 파이프라인을 읽을 수 없습니다"
            body={opsUnavailableLabel(essay.state.data.reason)}
          />
        ) : essayRows.length === 0 ? (
          <AdminEmpty
            title="조회된 평가가 없습니다"
            body="선택한 상태에 해당하는 평가 요청이 아직 없습니다."
          />
        ) : (
          <>
            <ul className="admin-orders">
              {essayRows.map((item) => (
                <EvaluationRow key={item.evaluationId} item={item} type="humanities" />
              ))}
            </ul>
            {essayFirstPage.length >= 25 && essayCursorNext ? (
              <div className="admin-order__actions">
                <button
                  className="button button--outline button--small"
                  type="button"
                  onClick={() => {
                    setEssayPages((current) => [...current, ...essayFirstPage]);
                    setEssayCursor(essayCursorNext);
                  }}
                >
                  이전 평가 더 보기
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="admin-section">
        <h2>수리논술 평가</h2>
        {math.state.status === "loading" ? (
          <AdminLoading label="수리 평가 이력을 불러오는 중입니다" />
        ) : math.state.status === "error" ? (
          <AdminErrorPanel kind={math.state.kind} onRetry={math.reload} />
        ) : !math.state.data.available ? (
          <AdminEmpty
            title="수리논술 런타임이 배포되어 있지 않습니다"
            body={`${mathRuntimeLabel()} · ${opsUnavailableLabel(math.state.data.reason)}. 배포되지 않은 런타임은 0건으로 표시하지 않습니다.`}
          />
        ) : math.state.data.items.length === 0 ? (
          <AdminEmpty title="조회된 평가가 없습니다" body="수리 평가 요청이 아직 없습니다." />
        ) : (
          <ul className="admin-orders">
            {math.state.data.items.map((item) => (
              <EvaluationRow key={item.evaluationId} item={item} type="math" />
            ))}
          </ul>
        )}
      </section>

      <section className="admin-section">
        <h2>AI 품질 검토</h2>
        <p className="admin-section__note">
          사람 품질 판정의 제출·이력은 별도 권한이 필요한 AI 품질 콘솔에서 처리합니다. 이 화면은
          검토 여부와 판정 결과만 표시하며, 품질 검토 권한을 대신하지 않습니다.
        </p>
        <div className="admin-order__actions">
          <a className="button button--outline button--small" href="/ql/">
            AI 품질 콘솔 열기
          </a>
        </div>
      </section>
    </div>
  );
}

function EvaluationRow({ item, type }: { item: OpsItem; type: string }) {
  const outcome = opsOutcomeLabel(item.outcome);
  const review = humanReviewStateLabel(item.humanReviewState);
  return (
    <li className="admin-order">
      <div className="admin-order__head">
        <p className="admin-order__id">{item.evaluationId}</p>
        <p className={`admin-tag admin-tag--${outcome.tone}`}>{outcome.label}</p>
      </div>
      <dl className="admin-order__facts">
        <div>
          <dt>구분</dt>
          <dd>{opsProductLabel(type, item.attemptKind)}</dd>
        </div>
        <div>
          <dt>요청 종류</dt>
          <dd>{opsRequestKindLabel(item.requestKind)}</dd>
        </div>
        <div>
          <dt>처리 상태</dt>
          <dd>{opsStatusLabel(item.status)}</dd>
        </div>
        <div>
          <dt>제출 시각</dt>
          <dd>{formatDateTime(item.requestedAt)}</dd>
        </div>
        <div>
          <dt>평가 소요 시간</dt>
          <dd>{formatProcessing(item.processingMs)}</dd>
        </div>
        <div>
          <dt>모델 / 프롬프트</dt>
          <dd>{opsModelLabel(item)}</dd>
        </div>
        <div>
          <dt>Credit</dt>
          <dd>{opsBillingLabel(item)}</dd>
        </div>
        <div>
          <dt>사람 검토</dt>
          <dd>
            <span className={`admin-tag admin-tag--${review.tone}`}>{review.label}</span>
            {item.humanReviewDisposition
              ? ` · ${humanDispositionLabel(item.humanReviewDisposition)}`
              : ""}
          </dd>
        </div>
        <div>
          <dt>회원 식별자</dt>
          <dd>{item.memberId}</dd>
        </div>
      </dl>
      {item.isReevaluation ? (
        <p className="admin-order__flag" role="status">
          재평가 요청입니다.
        </p>
      ) : null}
      {item.invalidated ? (
        <p className="admin-order__flag" role="status">
          무효화된 평가입니다{item.invalidationReason ? ` · ${item.invalidationReason}` : ""}.
        </p>
      ) : null}
      {item.errorCode ? (
        <p className="admin-order__flag" role="status">
          오류 코드 {item.errorCode}
        </p>
      ) : null}
    </li>
  );
}
