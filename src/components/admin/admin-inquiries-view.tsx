"use client";

import { useState } from "react";

import { ADMIN_MIN_QUERY, INQUIRY_MAX_REPLY } from "@/lib/admin/client";
import type { AdminInquiryDetail, AdminInquiryPage } from "@/lib/admin/contract";
import { AdminError, describeError } from "@/lib/admin/errors";
import {
  deliveryStateLabel,
  formatCount,
  formatCredit,
  formatDateTime,
  formatNumber,
  gradeLabel,
  inquiryCategoryLabel,
  inquiryStatusLabel,
} from "@/lib/admin/format";

import {
  AdminEmpty,
  AdminErrorPanel,
  AdminLoading,
  useAdminClient,
  useAdminQuery,
} from "./admin-surface";

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "RECEIVED", label: "접수" },
  { value: "IN_PROGRESS", label: "처리 중" },
  { value: "ANSWERED", label: "답변 완료" },
  { value: "CLOSED", label: "종결" },
] as const;

const REPLY_MIN = 2;

/**
 * 1:1 문의 운영 화면.
 *
 * 답변은 append-only이고, ANSWERED 상태는 답변이 있을 때만 설정됩니다. 회원에게
 * 발송되는 알림은 `inquiry_notifications` 큐를 통해 처리되며, 화면은 그 발송
 * 상태를 표시할 뿐 직접 메일을 보내지 않습니다.
 */
export function AdminInquiriesView() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useAdminQuery<AdminInquiryPage>(
    (client) => client.inquiryList({ query: query || undefined, status: status || undefined }),
    `inquiries:${query}:${status}`,
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (trimmed && trimmed.length < ADMIN_MIN_QUERY) {
      setHint(`검색어는 ${ADMIN_MIN_QUERY}자 이상 입력해 주세요.`);
      return;
    }
    setHint(null);
    setQuery(trimmed);
  }

  return (
    <div className="admin-stack">
      <section className="admin-section">
        <h2>1:1 문의</h2>
        <p className="admin-section__note">
          제목 또는 회원 식별자로 조회합니다. 회원에게는 답변이 등록될 때 알림 메일이
          발송됩니다.
        </p>
        <form className="admin-search" onSubmit={submit} role="search">
          <label className="admin-search__label" htmlFor="admin-inquiry-query">
            제목 또는 회원 식별자
          </label>
          <div className="admin-search__row">
            <input
              id="admin-inquiry-query"
              className="admin-search__input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="제목 또는 회원 식별자"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="button button--accent" type="submit">
              조회
            </button>
          </div>
          <div className="admin-search__filters">
            <label className="admin-search__label" htmlFor="admin-inquiry-status">
              처리 상태
            </label>
            <select
              id="admin-inquiry-status"
              className="admin-search__input"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {hint ? (
            <p className="admin-search__hint" role="status">
              {hint}
            </p>
          ) : null}
        </form>
      </section>

      {list.state.status === "loading" ? (
        <AdminLoading label="문의 목록을 불러오는 중입니다" />
      ) : list.state.status === "error" ? (
        <AdminErrorPanel kind={list.state.kind} onRetry={list.reload} />
      ) : (
        <section className="admin-section">
          <h2>문의 목록</h2>
          <div className="admin-metrics">
            <div className="admin-metric">
              <p className="admin-metric__label">전체</p>
              <p className="admin-metric__value">{formatNumber(list.state.data.total)}</p>
            </div>
            <div className="admin-metric">
              <p className="admin-metric__label">미처리</p>
              <p className="admin-metric__value">{formatNumber(list.state.data.open)}</p>
              <p className="admin-metric__note">접수 및 처리 중</p>
            </div>
          </div>

          {list.state.data.items.length === 0 ? (
            <AdminEmpty title="조회된 문의가 없습니다" body="검색 조건을 바꾸어 다시 조회해 주세요." />
          ) : (
            <ul className="admin-inquiries">
              {list.state.data.items.map((row) => {
                const badge = inquiryStatusLabel(row.status);
                const expanded = openId === row.inquiryId;
                return (
                  <li key={row.inquiryId} className="admin-inquiry">
                    <div className="admin-inquiry__head">
                      <p className="admin-inquiry__title">{row.title}</p>
                      <p className={`admin-tag admin-tag--${badge.tone}`}>{badge.label}</p>
                    </div>
                    <p className="admin-inquiry__meta">
                      {inquiryCategoryLabel(row.category)} · {formatDateTime(row.createdAt)} ·
                      답변 {formatNumber(row.replyCount)}건
                    </p>
                    <p className="admin-inquiry__preview">{row.preview}</p>
                    <button
                      className="button button--quiet"
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpenId(expanded ? null : row.inquiryId)}
                    >
                      {expanded ? "상세 닫기" : "상세 열기"}
                    </button>
                    {expanded ? (
                      <AdminInquiryDetailPanel
                        inquiryId={row.inquiryId}
                        onChanged={() => {
                          list.reload();
                        }}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function AdminInquiryDetailPanel({
  inquiryId,
  onChanged,
}: {
  inquiryId: string;
  onChanged: () => void;
}) {
  const detail = useAdminQuery<AdminInquiryDetail>(
    (client) => client.inquiryDetail(inquiryId),
    `inquiry-detail:${inquiryId}`,
  );
  const client = useAdminClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (detail.state.status === "loading") return <AdminLoading label="문의를 불러오는 중입니다" />;
  if (detail.state.status === "error") {
    return <AdminErrorPanel kind={detail.state.kind} onRetry={detail.reload} />;
  }
  const data = detail.state.data;
  const badge = inquiryStatusLabel(data.inquiry.status);
  const closed = data.inquiry.status === "CLOSED";

  async function submitReply(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length < REPLY_MIN) {
      setFailure("답변 내용을 입력해 주세요.");
      return;
    }
    if (trimmed.length > INQUIRY_MAX_REPLY) {
      setFailure(`답변은 ${formatNumber(INQUIRY_MAX_REPLY)}자 이내로 입력해 주세요.`);
      return;
    }
    setBusy(true);
    setFailure(null);
    setNotice(null);
    try {
      if (!client) throw new AdminError("NETWORK", "client unavailable");
      // A fresh request key per submission makes a double-click idempotent at the
      // database rather than a second reply.
      const result = await client.replyInquiry({
        inquiryId,
        body: trimmed,
        requestKey: crypto.randomUUID(),
      });
      setBody("");
      setNotice(
        result.created
          ? "답변을 등록했습니다. 회원에게 알림이 발송됩니다."
          : "이미 등록된 답변입니다. 추가로 발송하지 않았습니다.",
      );
      detail.reload();
      onChanged();
    } catch (error) {
      setFailure(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(next: string) {
    setBusy(true);
    setFailure(null);
    setNotice(null);
    try {
      if (!client) throw new AdminError("NETWORK", "client unavailable");
      const result = await client.setInquiryStatus({ inquiryId, status: next });
      setNotice(result.changed ? "처리 상태를 변경했습니다." : "이미 같은 상태입니다.");
      detail.reload();
      onChanged();
    } catch (error) {
      setFailure(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-inquiry__detail">
      <dl className="admin-order__facts">
        <div>
          <dt>문의 유형</dt>
          <dd>{inquiryCategoryLabel(data.inquiry.category)}</dd>
        </div>
        <div>
          <dt>처리 상태</dt>
          <dd>
            <span className={`admin-tag admin-tag--${badge.tone}`}>{badge.label}</span>
          </dd>
        </div>
        <div>
          <dt>접수 일시</dt>
          <dd>{formatDateTime(data.inquiry.submittedAt)}</dd>
        </div>
        <div>
          <dt>답변 일시</dt>
          <dd>{formatDateTime(data.inquiry.answeredAt)}</dd>
        </div>
        <div>
          <dt>학년</dt>
          <dd>{gradeLabel(data.member.gradeLevel)}</dd>
        </div>
        <div>
          <dt>보유 Credit</dt>
          <dd>{formatCredit(data.member.spendable)}</dd>
        </div>
        <div>
          <dt>첨삭 평가</dt>
          <dd>{formatCount(data.related.essayEvaluations)}</dd>
        </div>
        <div>
          <dt>결제 주문</dt>
          <dd>{formatCount(data.related.paymentOrders)}</dd>
        </div>
      </dl>

      <div className="admin-inquiry__body">
        <h3>문의 내용</h3>
        <p className="admin-prose">{data.inquiry.body}</p>
      </div>

      <div className="admin-inquiry__thread">
        <h3>답변</h3>
        {data.replies.length === 0 ? (
          <p className="admin-section__note">아직 등록된 답변이 없습니다.</p>
        ) : (
          <ul className="admin-replies">
            {data.replies.map((reply) => {
              const delivery = deliveryStateLabel(reply.delivery);
              return (
                <li key={reply.replyId} className="admin-reply">
                  <p className="admin-reply__meta">
                    {formatDateTime(reply.createdAt)} ·{" "}
                    <span className={`admin-tag admin-tag--${delivery.tone}`}>
                      {delivery.label}
                    </span>
                    {reply.attempts > 0 ? ` · 발송 시도 ${formatNumber(reply.attempts)}회` : ""}
                  </p>
                  <p className="admin-prose">{reply.body}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {notice ? (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      ) : null}
      {failure ? (
        <p className="admin-error admin-error--inline" role="alert">
          {failure}
        </p>
      ) : null}

      {closed ? (
        <p className="admin-section__note">
          종결된 문의입니다. 다시 처리하려면 상태를 처리 중으로 변경해 주세요.
        </p>
      ) : null}

      <form className="admin-reply-form" onSubmit={submitReply}>
        <label className="admin-search__label" htmlFor={`reply-${inquiryId}`}>
          답변 작성
        </label>
        <textarea
          id={`reply-${inquiryId}`}
          className="admin-search__input admin-reply-form__input"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          maxLength={INQUIRY_MAX_REPLY}
          disabled={busy}
        />
        <div className="admin-reply-form__actions">
          <button className="button button--accent" type="submit" disabled={busy}>
            답변 등록
          </button>
          <button
            className="button button--quiet"
            type="button"
            disabled={busy}
            onClick={() => changeStatus("IN_PROGRESS")}
          >
            처리 중으로
          </button>
          <button
            className="button button--quiet"
            type="button"
            disabled={busy}
            onClick={() => changeStatus("CLOSED")}
          >
            종결
          </button>
        </div>
        <p className="admin-section__note">
          답변은 등록 후 수정하거나 삭제할 수 없습니다. 확인 후 등록해 주세요.
        </p>
      </form>
    </div>
  );
}
