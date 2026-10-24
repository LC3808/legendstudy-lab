"use client";

import { useState } from "react";
import {AdminPeriodFilter} from './admin-period-filter';
import {periodBounds,type AdminPeriod} from '@/lib/admin/period';

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
  { value: "CANCELLED", label: "결제 취소" },
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
// Owner directive §9: one page shows five orders.
const PAYMENT_PAGE_LIMIT = 5;

export function AdminPaymentView() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [quantity,setQuantity]=useState('');
  const [period,setPeriod]=useState<AdminPeriod>('all'),[from,setFrom]=useState(''),[to,setTo]=useState('');
  const [offset, setOffset] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  const result = useAdminQuery<AdminPaymentPage>(
    (client) =>
      client.paymentOrders({
        query: query || undefined,
        limit: 50,
        offset: 0,
      }),
    `payment:${query}`,
  );

  const bounds=periodBounds(period,from,to);
  const data=result.state.status==='ready'?result.state.data:null;
  // One RPC snapshot is a complete dataset only when total equals the returned rows.
  // Never calculate global statistics from a truncated page.
  const complete=!!data&&data.orders!==null&&data.total===data.orders.length;
  const filtered=complete&&bounds?data.orders!.filter(order=>(!quantity||order.quantity===Number(quantity))&&(!state||(state==='CANCELLED'?['CANCELLED','PARTIALLY_CANCELLED'].includes(order.state):order.state===state))&&Date.parse(order.createdAt)>=bounds.from&&Date.parse(order.createdAt)<bounds.to):[];
  const paid=filtered.filter(order=>order.state==='PAID');
  const currencies=[...new Set(paid.map(order=>order.currency))];
  const fallback=useAdminQuery<AdminPaymentPage>(data&&!complete?(client)=>client.paymentOrders({query:query||undefined,state:state||undefined,limit:PAYMENT_PAGE_LIMIT,offset}):null,`payment-page:${query}:${state}:${offset}:${complete}`);
  const orders=complete?filtered.slice(offset,offset+PAYMENT_PAGE_LIMIT):fallback.state.status==='ready'?fallback.state.data.orders??[]:[];
  const total=complete?filtered.length:fallback.state.status==='ready'?fallback.state.data.total:null;

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
              onChange={(event) => changeState(event.target.value)}
            >
              {STATE_FILTERS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <label>상품<select disabled={!!data&&!complete} value={quantity} onChange={e=>{setQuantity(e.target.value);setOffset(0);}}><option value="">전체</option>{[1,3,5,10].map(n=><option key={n} value={n}>{n}회권</option>)}</select></label>
          <fieldset disabled={!!data&&!complete}><AdminPeriodFilter period={period} from={from} to={to} onChange={(p,f,t)=>{setPeriod(p);setFrom(f);setTo(t);setOffset(0);}}/></fieldset>
          {!bounds&&<p role="status">조회할 시작일과 종료일을 선택해 주세요.</p>}
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
            <h2>주문 목록</h2>{!complete&&<p role="status">전체 주문이 조회 한도를 초과해 기존 페이지 조회를 표시합니다. 상품·기간 집계는 서버 연결이 필요합니다.</p>}
            {result.state.data.orders === null ? (
              <AdminEmpty
                title="결제 모듈이 설치되어 있지 않습니다"
                body="결제 마이그레이션이 적용된 환경에서만 주문 내역을 조회할 수 있습니다."
              />
            ) : !complete&&fallback.state.status==='loading' ? (<AdminLoading/>) : !complete&&fallback.state.status==='error' ? (<AdminErrorPanel kind={fallback.state.kind} onRetry={fallback.reload}/>) : orders.length === 0 ? (
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

          <section className="admin-section"><h2>선택 조건의 결제 통계</h2>{complete&&bounds?<><p>주문 생성일 기준 · 전체 조회 {data!.orders!.length}건 중 {filtered.length}건</p><p>결제 완료 {paid.length}건</p>{currencies.map(currency=><p key={currency}>결제 완료 금액 {formatNumber(paid.filter(o=>o.currency===currency).reduce((sum,o)=>sum+o.amount,0))} {currency}</p>)}{!paid.length&&<p>결제 완료 금액 0</p>}<p className="admin-muted">취소·부분 취소 주문은 완료 금액에서 제외합니다. 환불액을 추정한 순매출이 아닙니다.</p></>:<p role="status">{bounds?'전체 주문이 한 번의 조회 범위를 초과해 집계 연결이 필요합니다. 기존 계약의 최대 50건을 전체 통계로 표시하지 않습니다.':'기간을 선택해 주세요.'}</p>}</section>
        </>
      )}
    </div>
  );
}
