"use client";
import Link from "next/link";

import { SchoolDistribution } from "./school-distribution";

import {
  creditOriginLabel,
  formatCount,
  formatCredit,
  formatNumber,
  gradeLabel,
} from "@/lib/admin/format";
import type { AdminDashboard, AdminSupportMetrics } from "@/lib/admin/contract";
import { formatDateTime, formatDuration } from "@/lib/admin/format";
import {
  defaultMemberFilters,
  directorySchoolLabel,
  type MemberDirectory,
} from "@/lib/admin/members";

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

function Kpi({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "ok" | "warn" | "info";
}) {
  return (
    <div className={`admin-kpi${tone ? ` admin-kpi--${tone}` : ""}`}>
      <p className="admin-kpi__label">{label}</p>
      <p className="admin-kpi__value">{value}</p>
      {note ? <p className="admin-kpi__note">{note}</p> : null}
    </div>
  );
}

/**
 * Headline figures shown before the detailed sections. Every value is read from
 * the same `dashboard()` payload as the sections below, so the strip adds no
 * query and can never drift from the detail. The support queue has its own
 * query and stays in its own section.
 */
function KpiStrip({ data }: { data: AdminDashboard }) {
  return (
    <div className="admin-kpis">
      <Kpi label="전체 회원" value={formatNumber(data.members.total)} note="분모: 가입 완료 회원" />
      <Kpi label="최근 7일 가입" value={formatNumber(data.members.new7d)} note={`오늘 ${formatNumber(data.members.newToday)}`} tone="ok" />
      <Kpi label="최근 30일 활성" value={formatNumber(data.members.active30d)} note="학습 기록 기준" tone="info" />
      <Kpi label="논술 평가 완료" value={formatNumber(data.essay.evaluationCompleted)} note={`실패 ${formatNumber(data.essay.evaluationFailed)}`} />
      <Kpi label="사용 가능 Credit" value={formatCredit(data.credit.spendable)} note="단위: Credit" />
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

function SupportSection() {
  const { state, reload } = useAdminQuery<AdminSupportMetrics>(
    (client) => client.supportMetrics(),
    "support-metrics",
  );
  if (state.status === "loading") return <AdminLoading label="고객지원 현황을 불러오는 중입니다" />;
  if (state.status === "error") return <AdminErrorPanel kind={state.kind} onRetry={reload} />;
  const data = state.data;
  return (
    <Section title="고객지원" note="1:1 문의 접수와 답변 발송 상태입니다.">
      <div className="admin-metrics">
        <Metric label="미처리" value={formatNumber(data.open)} note="접수 및 처리 중" />
        <Metric label="오늘 접수" value={formatNumber(data.newToday)} />
        <Metric label="처리 중" value={formatNumber(data.inProgress)} />
        <Metric label="답변 완료" value={formatNumber(data.answered)} />
        <Metric label="종결" value={formatNumber(data.closed)} />
        <Metric
          label="첫 응답까지"
          value={formatDuration(data.firstResponseSeconds)}
          note="답변 완료 문의 평균"
        />
        <Metric
          label="발송 실패"
          value={formatNumber(data.failedDeliveries)}
          note="재발송 대기 포함"
        />
      </div>
      {data.oldestOpenId ? (
        <p className="admin-muted">
          가장 오래된 미처리 문의: {formatDateTime(data.oldestOpenAt)}
        </p>
      ) : (
        <p className="admin-muted">미처리 문의가 없습니다.</p>
      )}
    </Section>
  );
}

const academicStatusLabel: Record<string, string> = {
  student: "재학생",
  retaker: "N수·검정고시 등",
  other: "기타",
};

/** How many of the most recent signups the dashboard lists. */
const RECENT_MEMBER_LIMIT = 8;

/**
 * The most recent signups, shown so an operator reads new-member status without
 * leaving the dashboard. This reuses the members directory RPC through
 * `listMembers` (sorted newest-first) — no new query shape, no new SQL — and the
 * columns match the 회원 console. "상세" deep-links to that console with the
 * member preselected, so the full 360 detail is never duplicated here.
 */
function RecentMembers() {
  const { state, reload } = useAdminQuery<MemberDirectory>(
    (client) =>
      client.listMembers(
        { ...defaultMemberFilters, sort: "newest" },
        { limit: RECENT_MEMBER_LIMIT, offset: 0 },
      ),
    `recent-members:${RECENT_MEMBER_LIMIT}`,
  );

  if (state.status === "loading")
    return <AdminLoading label="최근 가입 회원을 불러오는 중입니다" />;
  if (state.status === "error") return <AdminErrorPanel kind={state.kind} onRetry={reload} />;

  const { items, total } = state.data;

  return (
    <Section
      title="최근 가입 회원"
      note={`전체 ${formatNumber(total)}명 기준 · 가입 최근순 ${formatNumber(items.length)}명`}
    >
      {items.length === 0 ? (
        <p className="admin-muted">표시할 신규 회원이 없습니다.</p>
      ) : (
        <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="최근 가입 회원 목록">
          <table className="admin-table admin-table--recent">
            <thead>
              <tr>
                {["이메일", "학교", "학년", "현재 상태", "희망 전공", "닉네임", "가입일시", "상세"].map(
                  (head) => (
                    <th scope="col" key={head}>
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((member) => (
                <tr key={member.accountId}>
                  <td>{member.email ?? "이메일 미등록"}</td>
                  <td>{directorySchoolLabel(member)}</td>
                  <td>{member.grade ? `${member.grade}학년` : "미입력"}</td>
                  <td>
                    {member.academicStatus
                      ? academicStatusLabel[member.academicStatus] ?? member.academicStatus
                      : "미설정"}
                  </td>
                  <td>{member.major ?? "미설정"}</td>
                  <td>{member.displayName ?? "미설정"}</td>
                  <td>{formatDateTime(member.createdAt)}</td>
                  <td>
                    <Link
                      className="button button--outline button--small"
                      href={`/admin/members/#member=${member.accountId}`}
                      aria-label={`${member.displayName || member.email || "회원"} 상세 보기`}
                    >
                      상세
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="admin-muted">
        <Link className="text-link" href="/admin/members/">
          회원 전체 목록 열기 →
        </Link>
      </p>
    </Section>
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
      <KpiStrip data={data} />
      <Section title="회원">
        <div className="admin-metrics">
          <Metric label="전체 회원" value={formatNumber(data.members.total)} />
          <Metric label="오늘 가입" value={formatNumber(data.members.newToday)} />
          <Metric label="최근 7일" value={formatNumber(data.members.new7d)} />
          <Metric label="최근 30일" value={formatNumber(data.members.new30d)} />
          <Metric label="최근 30일 활성" value={formatNumber(data.members.active30d)} note="학습 기록 기준" />
        </div>
      </Section>

      <RecentMembers />

      <Section title="프로필">
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
            <p className="admin-subhead">학교별 회원 분포 (상위 20)</p>
            <SchoolDistribution rows={data.profile.schoolDistribution} unsetCount={data.profile.schoolUnsetCount ?? null} />
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
      <SupportSection />
    </div>
  );
}
