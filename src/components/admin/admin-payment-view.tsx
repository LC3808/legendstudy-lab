"use client";

import { useState } from "react";

import { ADMIN_MIN_QUERY } from "@/lib/admin/client";
import type { AdminPaymentPage } from "@/lib/admin/contract";
import {
  formatCredit,
  formatDateTime,
  formatNumber,
  grantStateLabel,
  orderStateLabel,
  paymentModeLabel,
} from "@/lib/admin/format";

import { AdminEmpty, AdminErrorPanel, AdminLoading, useAdminQuery } from "./admin-surface";

const STATE_FILTERS = [
  { value: "", label: "전체" },
  { value: "PAID", label: "결제 완료" },
  { value: "AUTHORIZATION_PENDING", label: "승인 대기" },
  { value: "CANCEL_PENDING", label: "취소 처리 중" },
  { value: "PARTIALLY_CANCELLED", label: "부분 취소" },
  { value: "CANCELLED", label: "취소 완료" },
  { value: "FAILED", label: "결제 실패" },
  { value: "EXPIRED", label: "만료" },
] as const;

/**
 * Payment operations read.
 *
 * ADMIN-P0-B grants the console a read-only view of the order ledger. There is
 * no cancel, refund or reconcile control: those actions stay on the finance-only
 * `payment_support` contract, which no browser session can reach.
 *
 * When the payment migration is not installed the read reports that fact and
 * every figure renders as 미설치 rather than 0, because "0건" would tell an
 * operator that nothing had ever been sold.
 */
export function AdminPaymentView() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  const result = useAdminQuery<AdminPaymentPage>(
    (client) => client.paymentOrders({ query: query || undefined, state: state || undefined }),
    `payment:${query}:${state}`,
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
        <h2>결제 조회</h2>
        <p className="admin-section__note">
          주문번호 또는 회원 식별자로 조회합니다. 조회 전용이며, 취소·환불은 결제 운영
          절차로만 처리됩니다.
        </p>

        <form className="admin-search" onSubmit={submit} role="search">
          <label className="admin-search__label" htmlFor="admin-payment-query">
            주문번호 또는 회원 식별자
          </label>
          <div className="admin-search__row">
            <input
              id="admin-payment-query"
              className="admin-search__input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="주문번호 또는 회원 식별자"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="button button--accent" type="submit">
              조회
            </button>
          </div>
          <div className="admin-search__filters">
            <label className="admin-search__label" htmlFor="admin-payment-state">
              결제 상태
            </label>
            <select
              id="admin-payment-state"
              className="admin-search__input"
              value={state}
              onChange={(event) => setState(event.target.value)}
            >
              {STATE_FILTERS.map((option) => (
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

      {result.state.status === "loading" ? (
        <AdminLoading label="결제 내역을 불러오는 중입니다" />
      ) : result.state.status === "error" ? (
        <AdminErrorPanel kind={result.state.kind} onRetry={result.reload} />
      ) : (
        <>
          <section className="admin-section">
            <h2>결제 연동 상태</h2>
            <div className="admin-metrics">
              <div className="admin-metric">
                <p className="admin-metric__label">결제 모듈</p>
                <p className="admin-metric__value">
                  {result.state.data.installed ? "설치됨" : "미설치"}
                </p>
                <p className="admin-metric__note">{result.state.data.runtimeLabel}</p>
              </div>
              <div className="admin-metric">
                <p className="admin-metric__label">결제 모드</p>
                <p className="admin-metric__value">{paymentModeLabel(result.state.data.mode)}</p>
              </div>
              <div className="admin-metric">
                <p className="admin-metric__label">조회된 주문</p>
                <p className="admin-metric__value">
                  {result.state.data.total === null
                    ? "미설치"
                    : formatNumber(result.state.data.total)}
                </p>
              </div>
            </div>
          </section>

          <section className="admin-section">
            <h2>주문 목록</h2>
            {result.state.data.orders === null ? (
              <AdminEmpty
                title="결제 모듈이 설치되어 있지 않습니다"
                body="결제 마이그레이션이 적용된 환경에서만 주문 내역을 조회할 수 있습니다."
              />
            ) : result.state.data.orders.length === 0 ? (
              <AdminEmpty title="조회된 주문이 없습니다" body="검색 조건을 바꾸어 다시 조회해 주세요." />
            ) : (
              <ul className="admin-orders">
                {result.state.data.orders.map((order) => {
                  const payment = orderStateLabel(order.state);
                  const grant = grantStateLabel(order.grantState);
                  return (
                    <li key={order.orderId} className="admin-order">
                      <div className="admin-order__head">
                        <p className="admin-order__id">{order.orderId}</p>
                        <p className={`admin-tag admin-tag--${payment.tone}`}>{payment.label}</p>
                      </div>
                      <dl className="admin-order__facts">
                        <div>
                          <dt>상품</dt>
                          <dd>
                            {order.sku} · {formatCredit(order.quantity)}
                          </dd>
                        </div>
                        <div>
                          <dt>결제 금액</dt>
                          <dd>
                            {formatNumber(order.amount)} {order.currency}
                          </dd>
                        </div>
                        <div>
                          <dt>결제 모드</dt>
                          <dd>{paymentModeLabel(order.mode)}</dd>
                        </div>
                        <div>
                          <dt>Credit 지급</dt>
                          <dd>
                            <span className={`admin-tag admin-tag--${grant.tone}`}>
                              {grant.label}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt>결제 일시</dt>
                          <dd>{formatDateTime(order.paidAt)}</dd>
                        </div>
                        <div>
                          <dt>주문 생성</dt>
                          <dd>{formatDateTime(order.createdAt)}</dd>
                        </div>
                        <div>
                          <dt>회원 식별자</dt>
                          <dd>{order.subjectId ?? "-"}</dd>
                        </div>
                      </dl>
                      {order.reconciliationRequired ? (
                        <p className="admin-order__flag" role="status">
                          결제사 승인 결과 확인이 필요합니다. 결제 운영 절차로 확인해 주세요.
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
