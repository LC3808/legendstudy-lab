"use client";

import {
  creditOriginLabel,
  formatCredit,
  formatDate,
  formatDateTime,
  formatDelta,
  formatNumber,
  transactionTypeLabel,
} from "@/lib/admin/format";
import type { AdminCredit } from "@/lib/admin/contract";

import { AdminEmpty, AdminErrorPanel, AdminLoading, AdminPanel, useAdminQuery } from "./admin-surface";

import {AdminCreditGrantForm} from "./admin-credit-grant-form";

import {formatCreditReason, formatCreditActor} from "@/lib/credit-display";

const PAGE_LIMIT = 25;

export function AdminMemberCreditPanel({ accountId, email }: { accountId: string; email: string|null }) {
  const { state, reload } = useAdminQuery<AdminCredit>(
    (client) => client.memberCredit(accountId, { limit: PAGE_LIMIT }),
    `credit:${accountId}`,
  );

  if (state.status === "loading") return <AdminLoading label="크레딧 정보를 불러오는 중입니다" />;
  if (state.status === "error") return <AdminErrorPanel kind={state.kind} onRetry={reload} />;

  const data = state.data;
  const summary = data.summary;

  return (
    <div className="admin-credit">
      <div className="admin-credit__head">
        <h3>크레딧</h3>
        <AdminCreditGrantForm accountId={accountId} email={email} onGranted={reload} />
      </div>

      {summary === null ? (
        // Owner directive §6: distinguish "this member genuinely has no Credit
        // account" from "the admin read could not resolve the account". The
        // summary can be null in both cases, but the ledger page totals are read
        // independently — so grants or transactions existing while the summary is
        // null means rows exist that this read did not resolve, which is a lookup
        // problem to escalate, not an empty account.
        data.page.grantsTotal > 0 || data.page.transactionsTotal > 0 ? (
          <AdminPanel tone="warning" title="크레딧 요약을 불러오지 못했습니다">
            <p>
              지급 {formatNumber(data.page.grantsTotal)}건 · 거래{" "}
              {formatNumber(data.page.transactionsTotal)}건이 조회되었지만 요약 값을 가져오지
              못했습니다. 실제 잔액이 없는 것이 아니라 조회 계약이 이 계정을 해석하지 못한
              상태일 수 있습니다.
            </p>
            <p className="admin-panel__code">조회 계정 ID: {accountId}</p>
          </AdminPanel>
        ) : (
          <AdminEmpty
            title="크레딧 계정이 없습니다"
            body={`이 회원은 지급·거래 내역이 없어 크레딧 계정이 확인되지 않습니다. (조회 계정 ID: ${accountId})`}
          />
        )
      ) : (
        <>
          <div className="admin-metrics">
            <div className="admin-metric">
              <p className="admin-metric__label">사용 가능</p>
              <p className="admin-metric__value">{formatCredit(summary.spendable)}</p>
            </div>
            <div className="admin-metric">
              <p className="admin-metric__label">유료</p>
              <p className="admin-metric__value">{formatCredit(summary.paid)}</p>
            </div>
            <div className="admin-metric">
              <p className="admin-metric__label">무료</p>
              <p className="admin-metric__value">{formatCredit(summary.free)}</p>
            </div>
            <div className="admin-metric">
              <p className="admin-metric__label">기타</p>
              <p className="admin-metric__value">{formatCredit(summary.other)}</p>
            </div>
            <div className="admin-metric">
              <p className="admin-metric__label">예약</p>
              <p className="admin-metric__value">{formatCredit(summary.reserved)}</p>
            </div>
            <div className="admin-metric">
              <p className="admin-metric__label">다음 만료</p>
              <p className="admin-metric__value admin-metric__value--sm">
                {formatDate(summary.nextExpiry)}
              </p>
            </div>
          </div>

          <h4 className="admin-subhead">
            지급 단위 <span className="admin-muted">({formatNumber(data.page.grantsTotal)}건)</span>
          </h4>
          {data.grants.length === 0 ? (
            <p className="admin-muted">지급 내역이 없습니다.</p>
          ) : (
            <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="크레딧 지급 내역">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">구분</th>
                    <th scope="col">지급</th>
                    <th scope="col">잔액</th>
                    <th scope="col">예약</th>
                    <th scope="col">사용 가능</th>
                    <th scope="col">지급일</th>
                    <th scope="col">만료</th>
                  </tr>
                </thead>
                <tbody>
                  {data.grants.map((grant) => (
                    <tr key={grant.grantId}>
                      <td>
                        {creditOriginLabel(grant.origin)}
                        {grant.expired ? <span className="admin-tag">만료</span> : null}
                      </td>
                      <td>{formatNumber(grant.granted)}</td>
                      <td>{formatNumber(grant.balance)}</td>
                      <td>{formatNumber(grant.reserved)}</td>
                      <td>
                        <strong>{formatNumber(grant.available)}</strong>
                      </td>
                      <td>{formatDate(grant.createdAt)}</td>
                      <td>{grant.expiresAt ? formatDate(grant.expiresAt) : "없음"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h4 className="admin-subhead">
            거래 내역{" "}
            <span className="admin-muted">({formatNumber(data.page.transactionsTotal)}건)</span>
          </h4>
          {data.transactions.length === 0 ? (
            <p className="admin-muted">거래 내역이 없습니다.</p>
          ) : (
            <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="크레딧 거래 내역">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">유형</th>
                    <th scope="col">증감</th>
                    <th scope="col">사유</th>
                    <th scope="col">주체</th>
                    <th scope="col">일시</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((entry) => (
                    <tr key={entry.transactionId}>
                      <td>{transactionTypeLabel(entry.transactionType)}</td>
                      <td className={entry.balanceDelta < 0 ? "admin-delta--down" : "admin-delta--up"}>
                        {formatDelta(entry.balanceDelta)}
                      </td>
                      <td className="credit-history-text">{formatCreditReason(entry.reasonCode,entry.balanceDelta)}</td>
                      <td>{formatCreditActor(entry.actorKind)}</td>
                      <td>{formatDateTime(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
