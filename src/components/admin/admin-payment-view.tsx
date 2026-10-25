"use client";

import {AdminReleaseReport} from './admin-release-report';
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
// Owner directive §9: one page shows five orders.
const PAYMENT_PAGE_LIMIT = 5;

export function AdminPaymentView() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [offset, setOffset] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  const result = useAdminQuery<AdminPaymentPage>(
    (client) =>
      client.paymentOrders({
        query: query || undefined,
        state: state || undefined,
        limit: PAYMENT_PAGE_LIMIT,
        offset,
      }),
    `payment:${query}:${state}:${offset}`,
  );

  const orders=result.state.status==='ready'?result.state.data.orders??[]:[];
  const total=result.state.status==='ready'?result.state.data.total:null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (trimmed && trimmed.length < ADMIN_MIN_QUERY) {
      setHint(`검색어는 ${ADMIN_MIN_QUERY}자 이상 입력해 주세요.`);
      return;
    }
    setHint(null);
    setOffset(0);
    setQuery(trimmed);
  }

  function changeState(next: string) {
    setOffset(0);
    setState(next);
  }

  return (
    <div className="admin-stack">
      <AdminReleaseReport kind="payment" onPaymentState={changeState}/>
      <section className="admin-section">
        <h2>주문 상세 조회</h2>
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
                  {total === null
                    ? "미설치"
                    : formatNumber(total)}
                </p>
              </div>
            </div>
          </section>

          <section className="admin-section">
            <h2>개별 주문 상세 조회</h2>
            {result.state.data.orders === null ? (
              <AdminEmpty
                title="결제 모듈이 설치되어 있지 않습니다"
                body="결제 마이그레이션이 적용된 환경에서만 주문 내역을 조회할 수 있습니다."
              />
            ) : orders.length === 0 ? (
              <AdminEmpty title="조회된 주문이 없습니다" body="검색 조건을 바꾸어 다시 조회해 주세요." />
            ) : (
              <ul className="admin-orders">
                {orders.map((order) => {
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
                          <dt>크레딧 지급</dt>
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
            {total !== null && total > PAYMENT_PAGE_LIMIT ? (
              <nav className="admin-pager" aria-label="주문 목록 페이지">
                <button
                  className="button button--outline button--small"
                  type="button"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAYMENT_PAGE_LIMIT))}
                >
                  이전
                </button>
                <span className="admin-muted">
                  {formatNumber(Math.floor(offset / PAYMENT_PAGE_LIMIT) + 1)} /{" "}
                  {formatNumber(Math.max(1, Math.ceil(total / PAYMENT_PAGE_LIMIT)))}페이지
                </span>
                <button
                  className="button button--outline button--small"
                  type="button"
                  disabled={offset + PAYMENT_PAGE_LIMIT >= total}
                  onClick={() => setOffset(offset + PAYMENT_PAGE_LIMIT)}
                >
                  다음
                </button>
              </nav>
            ) : null}
          </section>


        </>
      )}
    </div>
  );
}
