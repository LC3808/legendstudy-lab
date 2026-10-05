"use client";

import {
  creditOriginLabel,
  formatCount,
  formatCredit,
  formatNumber,
  gradeLabel,
  schoolCodeLabel,
} from "@/lib/admin/format";
import type { AdminDashboard } from "@/lib/admin/contract";

import { AdminErrorPanel, AdminLoading, useAdminQuery } from "./admin-surface";

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="admin-metric">
      <p className="admin-metric__label">{label}</p>
      <p className="admin-metric__value">{value}</p>
      {note ? <p className="admin-metric__note">{note}</p> : null}
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-section">
      <h2>{title}</h2>
      {note ? <p className="admin-section__note">{note}</p> : null}
      {children}
    </section>
  );
}

function Bars({ rows }: { rows: { label: string; count: number }[] }) {
  const max = rows.reduce((value, row) => Math.max(value, row.count), 0);
  return (
    <ul className="admin-bars">
      {rows.map((row) => (
        <li key={row.label}>
          <span className="admin-bars__label">{row.label}</span>
          <span className="admin-bars__track" aria-hidden="true">
            <span
              className="admin-bars__fill"
              style={{ width: max > 0 ? `${Math.max(4, (row.count / max) * 100)}%` : "0%" }}
            />
          </span>
          <span className="admin-bars__count">{formatNumber(row.count)}</span>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboardView() {
  const { state, reload } = useAdminQuery<AdminDashboard>((client) => client.dashboard(), "dashboard");

  if (state.status === "loading") return <AdminLoading />;
  if (state.status === "error") return <AdminErrorPanel kind={state.kind} onRetry={reload} />;

  const data = state.data;
  const origins = Object.entries(data.credit.availableByOrigin);

  return (
    <div className="admin-stack">
      <Section title="회원">
        <div className="admin-metrics">
          <Metric label="전체 회원" value={formatNumber(data.members.total)} />
          <Metric label="오늘 가입" value={formatNumber(data.members.newToday)} />
          <Metric label="최근 7일" value={formatNumber(data.members.new7d)} />
          <Metric label="최근 30일" value={formatNumber(data.members.new30d)} />
          <Metric label="최근 30일 활성" value={formatNumber(data.members.active30d)} note="학습 기록 기준" />
        </div>
      </Section>

      <Section title="프로필" note="학교명은 저장하지 않으며 NEIS 학교 코드로만 집계합니다.">
        <div className="admin-split">
          <div>
            <p className="admin-subhead">학년 분포</p>
            {data.profile.gradeDistribution.length === 0 ? (
              <p className="admin-muted">표시할 데이터가 없습니다.</p>
            ) : (
              <Bars
                rows={data.profile.gradeDistribution.map((row) => ({
                  label: gradeLabel(row.key === "UNKNOWN" ? null : row.key),
                  count: row.count,
                }))}
              />
            )}
          </div>
          <div>
            <p className="admin-subhead">학교 코드 분포 (상위 20)</p>
            {data.profile.schoolDistribution.length === 0 ? (
              <p className="admin-muted">표시할 데이터가 없습니다.</p>
            ) : (
              <Bars
                rows={data.profile.schoolDistribution.map((row) => ({
                  label: schoolCodeLabel(row.key),
                  count: row.count,
                }))}
              />
            )}
          </div>
        </div>
      </Section>

      <Section title="논술">
        <div className="admin-metrics">
          <Metric label="답안 제출" value={formatNumber(data.essay.submissions)} />
          <Metric label="평가 요청" value={formatNumber(data.essay.evaluationRequests)} />
          <Metric label="평가 완료" value={formatNumber(data.essay.evaluationCompleted)} />
          <Metric label="평가 실패" value={formatNumber(data.essay.evaluationFailed)} />
          <Metric label="재작성" value={formatNumber(data.essay.rewrites)} />
          <Metric label="재첨삭" value={formatNumber(data.essay.reevaluations)} />
        </div>
      </Section>

      <Section
        title="수리논술"
        note={`현재 상태: ${data.math.runtimeState} · ${data.math.runtimeLabel}`}
      >
        <div className="admin-metrics">
          <Metric label="답안" value={formatCount(data.math.attempts)} />
          <Metric label="평가" value={formatCount(data.math.evaluations)} />
        </div>
      </Section>

      <Section title="Credit">
        <div className="admin-metrics">
          <Metric label="현재 사용 가능" value={formatCredit(data.credit.spendable)} />
          <Metric label="30일 내 만료 예정" value={formatCredit(data.credit.expiring30d)} />
          <Metric label="누적 지급" value={formatCredit(data.credit.grantedTotal)} />
          <Metric label="누적 사용" value={formatCredit(data.credit.consumedTotal)} />
        </div>
        {origins.length > 0 ? (
          <ul className="admin-origin">
            {origins.map(([origin, value]) => (
              <li key={origin}>
                <span>{creditOriginLabel(origin)}</span>
                <strong>{formatCredit(value)}</strong>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section
        title="결제"
        note={`현재 상태: ${data.payment.runtimeState} · ${data.payment.runtimeLabel}`}
      >
        <div className="admin-metrics">
          <Metric
            label="주문"
            value={formatCount(data.payment.orders)}
            note={data.payment.installed ? undefined : "결제 모듈이 설치되지 않았습니다."}
          />
        </div>
        <p className="admin-muted">
          결제가 열리기 전에는 매출 지표를 표시하지 않습니다. 위 값은 실제 주문 건수입니다.
        </p>
      </Section>
    </div>
  );
}
