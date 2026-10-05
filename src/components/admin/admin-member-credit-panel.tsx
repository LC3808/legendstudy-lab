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

import { AdminEmpty, AdminErrorPanel, AdminLoading, useAdminQuery } from "./admin-surface";

const PAGE_LIMIT = 25;

/**
 * Credit read + history for one account.
 *
 * Read-only. There is deliberately no grant, adjustment or reversal control:
 * writing Credit requires the canonical server-side grant function and a
 * separately provisioned finance capability, neither of which ADMIN-P0-A has.
 * The disabled placeholder below marks where ADMIN-P0-B attaches and carries no
 * href and no database call.
 */
export function AdminMemberCreditPanel({ accountId }: { accountId: string }) {
  const { state, reload } = useAdminQuery<AdminCredit>(
    (client) => client.memberCredit(accountId, { limit: PAGE_LIMIT }),
    `credit:${accountId}`,
  );

  if (state.status === "loading") return <AdminLoading label="Credit 정보를 불러오는 중입니다" />;
  if (state.status === "error") return <AdminErrorPanel kind={state.kind} onRetry={reload} />;

  const data = state.data;
  const summary = data.summary;

  return (
    <div className="admin-credit">
      <div className="admin-credit__head">
        <h3>Credit</h3>
        <button type="button" className="button button--outline button--small" disabled>
          Credit 지급 (준비 중)
        </button>
      </div>
      <p className="admin-muted">
        관리자 Credit 지급은 결제·재무 권한이 연결된 뒤 열립니다. 이 화면에서는 조회만 가능합니다.
      </p>

      {summary === null ? (
        <AdminEmpty
          title="Credit 계정이 없습니다"
          body="이 회원은 아직 Credit 계정이 만들어지지 않았습니다."
        />
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
            <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Credit 지급 내역">
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
            <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Credit 거래 내역">
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
                      <td>{entry.reasonCode ?? "-"}</td>
                      <td>{entry.actorKind ?? "-"}</td>
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
