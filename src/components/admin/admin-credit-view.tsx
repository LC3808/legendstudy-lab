"use client";

import { useState } from "react";

import type { AdminDashboard, AdminSearchPage } from "@/lib/admin/contract";
import { ADMIN_MIN_QUERY } from "@/lib/admin/client";
import { accountStateLabel, creditOriginLabel, formatCredit, formatNumber } from "@/lib/admin/format";

import { AdminEmpty, AdminErrorPanel, AdminLoading, useAdminQuery } from "./admin-surface";
import { AdminMemberCreditPanel } from "./admin-member-credit-panel";

/**
 * Credit overview.
 *
 * Shows the aggregate Credit picture and routes an operator to one member's
 * grant and transaction history. Manual support grants use the Admin-authorized canonical ledger RPC.
 */
export function AdminCreditView() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const summary = useAdminQuery<AdminDashboard>((client) => client.dashboard(), "credit-overview");
  const lookup = useAdminQuery<AdminSearchPage>(
    submitted ? (client) => client.searchMembers(submitted, { limit: 5 }) : null,
    `credit-lookup:${submitted ?? ""}`,
  );

  return (
    <div className="admin-stack">
      <section className="admin-section">
        <h2>Credit 현황</h2>
        {summary.state.status === "loading" ? (
          <AdminLoading label="Credit 현황을 불러오는 중입니다" />
        ) : summary.state.status === "error" ? (
          <AdminErrorPanel kind={summary.state.kind} onRetry={summary.reload} />
        ) : (
          <>
            <div className="admin-metrics">
              <div className="admin-metric">
                <p className="admin-metric__label">현재 사용 가능</p>
                <p className="admin-metric__value">
                  {formatCredit(summary.state.data.credit.spendable)}
                </p>
              </div>
              <div className="admin-metric">
                <p className="admin-metric__label">30일 내 만료 예정</p>
                <p className="admin-metric__value">
                  {formatCredit(summary.state.data.credit.expiring30d)}
                </p>
              </div>
              <div className="admin-metric">
                <p className="admin-metric__label">누적 지급</p>
                <p className="admin-metric__value">
                  {formatCredit(summary.state.data.credit.grantedTotal)}
                </p>
              </div>
              <div className="admin-metric">
                <p className="admin-metric__label">누적 사용</p>
                <p className="admin-metric__value">
                  {formatCredit(summary.state.data.credit.consumedTotal)}
                </p>
              </div>
            </div>
            <ul className="admin-origin">
              {Object.entries(summary.state.data.credit.availableByOrigin).map(([origin, value]) => (
                <li key={origin}>
                  <span>{creditOriginLabel(origin)}</span>
                  <strong>{formatCredit(value)}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="admin-muted">
          회원 조회 후 운영 Credit을 지급할 수 있습니다.
        </p>
      </section>

      <section className="admin-section">
        <h2>회원별 Credit 조회</h2>
        <form
          className="admin-search"
          onSubmit={(event) => {
            event.preventDefault();
            const value = input.trim();
            if (value.length < ADMIN_MIN_QUERY) {
              setHint("이메일 또는 계정 ID를 3자 이상 입력하세요.");
              return;
            }
            setHint(null);
            setAccountId(null);
            setSubmitted(value);
          }}
        >
          <label className="admin-search__label" htmlFor="admin-credit-query">
            이메일 또는 계정 ID
          </label>
          <div className="admin-search__row">
            <input
              id="admin-credit-query"
              className="admin-search__input"
              type="search"
              value={input}
              placeholder="member@legendstudy.com 또는 계정 UUID"
              autoComplete="off"
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" className="button button--primary button--small">
              조회
            </button>
          </div>
        </form>
        {hint ? <p className="admin-hint">{hint}</p> : null}

        {submitted === null ? null : lookup.state.status === "loading" ? (
          <AdminLoading label="회원을 찾는 중입니다" />
        ) : lookup.state.status === "error" ? (
          <AdminErrorPanel kind={lookup.state.kind} onRetry={lookup.reload} />
        ) : lookup.state.data.items.length === 0 ? (
          <AdminEmpty title="검색 결과가 없습니다" body="이메일 또는 계정 ID를 다시 확인하세요." />
        ) : (
          <ul className="admin-pick">
            {lookup.state.data.items.map((member) => {
              const label = accountStateLabel(member.accountState);
              return (
                <li key={member.accountId}>
                  <button
                    type="button"
                    className="admin-pick__button"
                    aria-pressed={accountId === member.accountId}
                    onClick={() => setAccountId(member.accountId)}
                  >
                    <span className="admin-pick__email">{member.email ?? member.accountId}</span>
                    <span className={`admin-state__badge admin-state__badge--${label.tone}`}>
                      {label.label}
                    </span>
                    <span className="admin-pick__credit">{formatCredit(member.spendable)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {lookup.state.status === "ready" && lookup.state.data.items.length > 0 ? (
          <p className="admin-muted">
            {formatNumber(lookup.state.data.items.length)}건 표시 · 정확한 계정 ID로 조회하면 한 건만
            표시됩니다.
          </p>
        ) : null}
      </section>

      {accountId ? (
        <>
          <section className="admin-section">
            <AdminMemberCreditPanel key={accountId} accountId={accountId} email={lookup.state.status === "ready" ? lookup.state.data.items.find(m=>m.accountId===accountId)?.email??null:null} />
          </section>

        </>
      ) : null}
    </div>
  );
}
