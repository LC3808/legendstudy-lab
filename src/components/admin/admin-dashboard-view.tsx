"use client";
import { useState } from "react";

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

import { AdminErrorPanel, AdminLoading, useAdminQuery } from "./admin-surface";

/**
 * Operations dashboard.
 *
 * Owner directive §4. The dashboard separates 누적 지표 (lifetime totals the
 * read already carries) from 기간 발생 지표 (counts within a chosen window), adds
 * a 조치 필요 band at the top, and shows a 기간 filter.
 *
 * The deployed `admin-v1` read exposes member counts for a few fixed windows
 * (오늘 / 최근 7일 / 최근 30일) and lifetime totals for everything else. It does
 * not accept an arbitrary period, and it carries no revenue, refund, active
 * 대학/시험/문항, or average-processing figure. Rather than invent those, the
 * dashboard shows them as 집계 불가 with the reason — a new aggregation RPC is
 * the recorded GAP, not a fabricated number.
 */

type PeriodKey = "today" | "d7" | "d30" | "month" | "all" | "custom";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "d7", label: "최근 7일" },
  { key: "d30", label: "최근 30일" },
  { key: "month", label: "이번 달" },
  { key: "all", label: "전체" },
  { key: "custom", label: "직접 선택" },
];

/** Member sign-ups the read can answer for a window, else null (GAP). */
function signupForPeriod(members: AdminDashboard["members"], period: PeriodKey): number | null {
  switch (period) {
    case "today":
      return members.newToday;
    case "d7":
      return members.new7d;
    case "d30":
      return members.new30d;
    case "all":
      return members.total;
    default:
      // 이번 달 / 직접 선택 need a period-aware RPC the read does not provide.
      return null;
  }
}

function PeriodFilter({ value, onChange }: { value: PeriodKey; onChange: (next: PeriodKey) => void }) {
  return (
    <div className="admin-period" role="group" aria-label="기간 선택">
      {PERIODS.map((period) => (
        <button
          key={period.key}
          type="button"
          className={`admin-period__button${period.key === value ? " admin-period__button--active" : ""}`}
          aria-pressed={period.key === value}
          onClick={() => onChange(period.key)}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="admin-metric">
      <p className="admin-metric__label">{label}</p>
      <p className="admin-metric__value">{value}</p>
      {note ? <p className="admin-metric__note">{note}</p> : null}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
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

function ActionCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone: "ok" | "attn" | "danger" | "muted";
}) {
  return (
    <div className={`admin-action admin-action--${tone}`}>
      <p className="admin-action__label">{label}</p>
      <p className="admin-action__value">{value}</p>
      {note ? <p className="admin-action__note">{note}</p> : null}
    </div>
  );
}

/** Percentage of a part over a whole, or "집계 불가" when the whole is zero. */
function ratio(part: number, whole: number): string {
  if (whole <= 0) return "집계 불가";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function ActionBand({
  dashboard,
  support,
}: {
  dashboard: AdminDashboard;
  support: AdminSupportMetrics | null;
}) {
  const failed = dashboard.essay.evaluationFailed;
  const expiring = dashboard.credit.expiring30d;
  const open = support?.open ?? null;
  return (
    <section className="admin-section">
      <h2>조치 필요</h2>
      <p className="admin-section__note">운영자가 지금 확인해야 할 신호입니다.</p>
      <div className="admin-actions">
        <ActionCard
          label="미답변 문의"
          value={open === null ? "집계 불가" : formatNumber(open)}
          note={open === null ? "고객지원 지표를 불러오지 못했습니다" : "접수 및 처리 중"}
          tone={open === null ? "muted" : open > 0 ? "attn" : "ok"}
        />
        <ActionCard
          label="첨삭 평가 실패"
          value={formatNumber(failed)}
          note="관리자 요약 조회 기준 · 시험별 첨삭 History 통합 집계는 미검증"
          tone={failed > 0 ? "danger" : "ok"}
        />
        <ActionCard
          label="30일 내 만료 Credit"
          value={formatCredit(expiring)}
          note="만료 임박 · 지급/회수 이상 탐지는 별도 집계 필요"
          tone={expiring > 0 ? "attn" : "ok"}
        />
        <ActionCard
          label="Worker 장애"
          value="집계 불가"
          note="Worker 상태 신호가 조회 계약에 없습니다 (GAP)"
          tone="muted"
        />
      </div>
    </section>
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
    <Section title="고객지원" note="1:1 문의 접수와 답변 발송 상태입니다. (누적)">
      <div className="admin-metrics">
        <Metric label="미처리" value={formatNumber(data.open)} note="접수 및 처리 중" />
        <Metric label="오늘 접수" value={formatNumber(data.newToday)} />
        <Metric label="처리 중" value={formatNumber(data.inProgress)} />
        <Metric label="답변 완료" value={formatNumber(data.answered)} />
        <Metric label="종결" value={formatNumber(data.closed)} />
        <Metric label="첫 응답까지" value={formatDuration(data.firstResponseSeconds)} note="답변 완료 문의 평균" />
        <Metric label="발송 실패" value={formatNumber(data.failedDeliveries)} note="재발송 대기 포함" />
      </div>
      {data.oldestOpenId ? (
        <p className="admin-muted">가장 오래된 미처리 문의: {formatDateTime(data.oldestOpenAt)}</p>
      ) : (
        <p className="admin-muted">미처리 문의가 없습니다.</p>
      )}
    </Section>
  );
}

export function AdminDashboardView() {
  const [period, setPeriod] = useState<PeriodKey>("d30");
  const dashboard = useAdminQuery<AdminDashboard>((client) => client.dashboard(), "dashboard");
  const support = useAdminQuery<AdminSupportMetrics>((client) => client.supportMetrics(), "dashboard-support");

  if (dashboard.state.status === "loading") return <AdminLoading />;
  if (dashboard.state.status === "error") return <AdminErrorPanel kind={dashboard.state.kind} onRetry={dashboard.reload} />;

  const data = dashboard.state.data;
  const supportData = support.state.status === "ready" ? support.state.data : null;
  const origins = Object.entries(data.credit.availableByOrigin);
  const signup = signupForPeriod(data.members, period);
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "";
  const evalTotal = data.essay.evaluationCompleted + data.essay.evaluationFailed;

  return (
    <div className="admin-stack">
      <ActionBand dashboard={data} support={supportData} />

      <Section title="기간 선택" note="신규가입은 선택한 기간으로 집계합니다. 그 외 지표는 아래에 누적/기간 구분을 표시합니다.">
        <PeriodFilter value={period} onChange={setPeriod} />
      </Section>

      <Section title="회원">
        <div className="admin-metrics">
          <Metric
            label={`신규가입 · ${periodLabel}`}
            value={signup === null ? "집계 불가" : formatNumber(signup)}
            note={signup === null ? "이번 달·직접 선택은 기간 집계 RPC가 필요합니다 (GAP)" : "선택한 기간 신규 가입"}
          />
          <Metric label="활성 회원" value={formatNumber(data.members.active30d)} note="최근 30일 학습 기록 기준" />
          <Metric label="누적 회원" value={formatNumber(data.members.total)} note="전체 가입 (누적)" />
        </div>
      </Section>

      <Section title="프로필" note="누적">
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

      <Section title="첨삭 (논술)" note="관리자 요약 조회 기준 · 시험별 첨삭 History 통합 및 무료/유료 재첨삭 구분은 미검증입니다 (GAP)">
        <div className="admin-metrics">
          <Metric label="답안 제출" value={formatNumber(data.essay.submissions)} />
          <Metric label="평가 요청" value={formatNumber(data.essay.evaluationRequests)} />
          <Metric label="평가 완료 (첨삭)" value={formatNumber(data.essay.evaluationCompleted)} />
          <Metric label="평가 실패" value={formatNumber(data.essay.evaluationFailed)} />
          <Metric label="재작성" value={formatNumber(data.essay.rewrites)} />
          <Metric label="재첨삭" value={formatNumber(data.essay.reevaluations)} note="무료/유료 구분 불가" />
        </div>
      </Section>

      <Section title="첨삭 평가 품질" note={`관리자 요약 조회 기준 · 완료+실패 ${formatNumber(evalTotal)}건 기준`}>
        <div className="admin-metrics">
          <Metric label="평가 성공률" value={ratio(data.essay.evaluationCompleted, evalTotal)} note="평가 완료 / (완료+실패)" />
          <Metric label="평가 실패율" value={ratio(data.essay.evaluationFailed, evalTotal)} note="평가 실패 / (완료+실패)" />
          <Metric label="평균 처리시간" value="집계 불가" note="논술·수리 운영 화면에서 확인 (대시보드 계약에 없음)" />
        </div>
      </Section>

      <Section title="수리논술" note={`관리자 조회 설정: ${data.math.runtimeState} · ${data.math.runtimeLabel}`}>
        <div className="admin-metrics">
          <Metric label="답안" value={formatCount(data.math.attempts)} />
          <Metric label="평가" value={formatCount(data.math.evaluations)} />
        </div>
      </Section>

      <Section title="Credit" note="누적 · 잔액은 현재 시점 기준">
        <div className="admin-metrics">
          <Metric label="잔액 (사용 가능)" value={formatCredit(data.credit.spendable)} />
          <Metric label="누적 지급" value={formatCredit(data.credit.grantedTotal)} />
          <Metric label="누적 사용" value={formatCredit(data.credit.consumedTotal)} />
          <Metric label="30일 내 만료 예정" value={formatCredit(data.credit.expiring30d)} />
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

      <Section title="결제" note={`WEB 결제 조회 설정: ${data.payment.runtimeState} · ${data.payment.runtimeLabel}`}>
        <div className="admin-metrics">
          <Metric
            label="주문"
            value={formatCount(data.payment.orders)}
            note={data.payment.installed ? "누적 주문 건수" : "결제 모듈이 설치되지 않았습니다."}
          />
          <Metric label="총 결제금액" value="집계 불가" note="매출 집계 RPC 필요 (GAP)" />
          <Metric label="환불금액" value="집계 불가" note="환불 집계 RPC 필요 (GAP)" />
          <Metric label="순매출" value="집계 불가" note="매출−환불 집계 RPC 필요 (GAP)" />
        </div>
        <p className="admin-muted">
          결제가 열리기 전에는 매출 지표를 표시하지 않습니다. 주문 건수만 실제 값입니다.
        </p>
      </Section>

      <Section title="서비스" note="활성 대학·시험·문항 수는 운영 레지스트리 집계가 필요합니다 (GAP)">
        <div className="admin-metrics">
          <Metric label="활성 대학" value="집계 불가" note="Registry 집계 RPC 필요" />
          <Metric label="활성 시험" value="집계 불가" note="Registry 집계 RPC 필요" />
          <Metric label="활성 문항" value="집계 불가" note="Registry 집계 RPC 필요" />
        </div>
      </Section>

      <SupportSection />
    </div>
  );
}
