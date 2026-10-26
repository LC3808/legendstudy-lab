"use client";

import {AdminReleaseReport} from './admin-release-report';
import {AdminCreditMembers} from "./admin-credit-members";

import type { AdminDashboard } from "@/lib/admin/contract";
import { creditOriginLabel, formatCredit } from "@/lib/admin/format";

import { AdminErrorPanel, AdminLoading, useAdminQuery } from "./admin-surface";

/**
 * Credit overview.
 *
 * Shows the aggregate Credit picture and routes an operator to one member's
 * grant and transaction history. Manual support grants use the Admin-authorized canonical ledger RPC.
 */
export function AdminCreditView() {
  const summary = useAdminQuery<AdminDashboard>((client) => client.dashboard(), "credit-overview");
  return (
    <div className="admin-stack">
      <AdminCreditMembers onGranted={summary.reload} />
      <section className="admin-section">
        <h2>크레딧 현황</h2>
        {summary.state.status === "loading" ? (
          <AdminLoading label="크레딧 현황을 불러오는 중입니다" />
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
            </div>
            <p className="admin-muted">아래는 출처별 현재 사용 가능한 잔액입니다. 누적 구매·지급 수량이 아닙니다.</p><ul className="admin-origin">
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
          회원 조회 후 운영 크레딧을 지급할 수 있습니다.
        </p>
      </section>

      <AdminReleaseReport kind="credit"/>

    </div>
  );
}
