"use client";

import { useState } from "react";

import type { AdminMemberDetail, AdminSearchPage } from "@/lib/admin/contract";
import { ADMIN_MIN_QUERY } from "@/lib/admin/client";
import {
  accountStateLabel,
  formatCredit,
  formatDateTime,
  formatNumber,
  gradeLabel,
  schoolCodeLabel,
} from "@/lib/admin/format";

import { AdminEmpty, AdminErrorPanel, AdminLoading, useAdminQuery } from "./admin-surface";
import { AdminMemberCreditPanel } from "./admin-member-credit-panel";

const PAGE_LIMIT = 25;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-detail__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AdminMemberDetailPanel({ accountId }: { accountId: string }) {
  const { state, reload } = useAdminQuery<AdminMemberDetail>(
    (client) => client.memberDetail(accountId),
    `detail:${accountId}`,
  );

  if (state.status === "loading") return <AdminLoading label="회원 정보를 불러오는 중입니다" />;
  if (state.status === "error") return <AdminErrorPanel kind={state.kind} onRetry={reload} />;

  const data = state.data;
  const state_ = accountStateLabel(data.account.state);

  return (
    <div className="admin-detail">
      <h3>회원 상세</h3>
      <dl className="admin-detail__grid">
        <DetailRow label="계정 ID" value={data.member.accountId} />
        <DetailRow label="이메일" value={data.member.email ?? "-"} />
        <DetailRow label="가입일" value={formatDateTime(data.member.createdAt)} />
        <DetailRow label="이메일 인증" value={data.member.emailConfirmed === null ? "확인 불가" : data.member.emailConfirmed ? "완료" : "대기"} />
        <DetailRow label="로그인 방식" value={data.member.authProviders?.join(", ") || "확인 불가"} />
        <DetailRow label="표시 이름" value={data.member.displayName ?? "미입력"} />
        <DetailRow label="학년" value={gradeLabel(data.member.gradeLevel)} />
        <DetailRow label="학교 코드" value={schoolCodeLabel(data.member.schoolCode)} />
        <DetailRow label="희망 전공" value={data.member.intendedMajor ?? "미입력"} />
        <DetailRow label="관심 대학·학과" value={data.member.targetUniversities === null ? "확인 불가" : data.member.targetUniversities.map((t) => `${t.universityName}${t.intendedDivision ? ` · ${t.intendedDivision}` : ""}`).join(", ") || "미입력"} />
      </dl>

      <h4 className="admin-subhead">계정 상태</h4>
      <p className="admin-state">
        <span className={`admin-state__badge admin-state__badge--${state_.tone}`}>{state_.label}</span>
        <span className="admin-muted">{data.account.state}</span>
      </p>
      {data.account.deletion ? (
        <dl className="admin-detail__grid">
          <DetailRow label="요청 단계" value={data.account.deletion.phase} />
          <DetailRow label="요청일" value={formatDateTime(data.account.deletion.requestedAt)} />
          <DetailRow
            label="예정일"
            value={formatDateTime(data.account.deletion.scheduledDeletionAt)}
          />
          <DetailRow label="완료일" value={formatDateTime(data.account.deletion.completedAt)} />
        </dl>
      ) : (
        <p className="admin-muted">진행 중인 계정 삭제 요청이 없습니다.</p>
      )}

      <h4 className="admin-subhead">서비스 이용</h4>
      <div className="admin-metrics">
        <div className="admin-metric">
          <p className="admin-metric__label">최근 학습</p>
          <p className="admin-metric__value admin-metric__value--sm">
            {formatDateTime(data.usage.study.lastStartedAt)}
          </p>
          <p className="admin-metric__note">
            누적 {formatNumber(data.usage.study.sessionsTotal)}회 · 최근 30일{" "}
            {formatNumber(data.usage.study.sessions30d)}회
          </p>
        </div>
        <div className="admin-metric">
          <p className="admin-metric__label">인문 논술</p>
          <p className="admin-metric__value admin-metric__value--sm">
            제출 {formatNumber(data.usage.essay.submitted)}건
          </p>
          <p className="admin-metric__note">
            작성 {formatNumber(data.usage.essay.attempts)}건 · 평가{" "}
            {formatNumber(data.usage.essay.evaluations)}건
          </p>
        </div>
        <div className="admin-metric">
          <p className="admin-metric__label">수리 논술</p>
          <p className="admin-metric__value admin-metric__value--sm">
            {data.usage.math.installed ? formatNumber(data.usage.math.attempts) : "미설치"}
          </p>
          <p className="admin-metric__note">
            {data.usage.math.runtimeState} · 평가 기능 비활성
          </p>
        </div>
        <div className="admin-metric">
          <p className="admin-metric__label">모의고사</p>
          <p className="admin-metric__value admin-metric__value--sm">
            {formatNumber(data.usage.mock.attempts)}건
          </p>
          <p className="admin-metric__note">
            최근 {formatDateTime(data.usage.mock.lastSubmittedAt)}
          </p>
        </div>
        <div className="admin-metric">
          <p className="admin-metric__label">보관함</p>
          <p className="admin-metric__value admin-metric__value--sm">
            북마크 {formatNumber(data.usage.library.bookmarks)}
          </p>
          <p className="admin-metric__note">
            최근 본 자료 {formatNumber(data.usage.library.recentViews)}건
          </p>
        </div>
      </div>
      <p className="admin-muted">답안 본문은 이 화면에 표시하지 않습니다.</p>

      <AdminMemberCreditPanel accountId={accountId} />
    </div>
  );
}

export function AdminMembersView() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const { state, reload } = useAdminQuery<AdminSearchPage>(
    submitted ? (client) => client.searchMembers(submitted, { limit: PAGE_LIMIT }) : null,
    `search:${submitted ?? ""}`,
  );

  return (
    <div className="admin-stack">
      <section className="admin-section">
        <h2>회원 검색</h2>
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
            setSelected(null);
            setSubmitted(value);
          }}
        >
          <label className="admin-search__label" htmlFor="admin-member-query">
            이메일 또는 계정 ID
          </label>
          <div className="admin-search__row">
            <input
              id="admin-member-query"
              className="admin-search__input"
              type="search"
              value={input}
              placeholder="member@legendstudy.com 또는 계정 UUID"
              autoComplete="off"
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" className="button button--primary button--small">
              검색
            </button>
          </div>
        </form>
        {hint ? <p className="admin-hint">{hint}</p> : null}
        <p className="admin-muted">답안 본문이나 자유 텍스트로는 검색할 수 없습니다.</p>
      </section>

      {submitted === null ? (
        <AdminEmpty title="회원을 검색하세요" body="이메일 또는 계정 ID로 조회합니다." />
      ) : state.status === "loading" ? (
        <AdminLoading label="회원을 검색하는 중입니다" />
      ) : state.status === "error" ? (
        <AdminErrorPanel kind={state.kind} onRetry={reload} />
      ) : state.data.items.length === 0 ? (
        <AdminEmpty title="검색 결과가 없습니다" body="이메일 또는 계정 ID를 다시 확인하세요." />
      ) : (
        <section className="admin-section">
          <h2>
            검색 결과 <span className="admin-muted">{state.data.items.length}건</span>
          </h2>
          <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="회원 검색 결과">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">이메일</th>
                  <th scope="col">가입일</th>
                  <th scope="col">이름</th>
                  <th scope="col">학년</th>
                  <th scope="col">학교 코드</th>
                  <th scope="col">상태</th>
                  <th scope="col">Credit</th>
                  <th scope="col">상세</th>
                </tr>
              </thead>
              <tbody>
                {state.data.items.map((member) => {
                  const label = accountStateLabel(member.accountState);
                  return (
                    <tr key={member.accountId}>
                      <td>{member.email ?? "-"}</td>
                      <td>{formatDateTime(member.createdAt)}</td>
                      <td>{member.displayName ?? "미입력"}</td>
                      <td>{gradeLabel(member.gradeLevel)}</td>
                      <td>{schoolCodeLabel(member.schoolCode)}</td>
                      <td>
                        <span className={`admin-state__badge admin-state__badge--${label.tone}`}>
                          {label.label}
                        </span>
                      </td>
                      <td>{formatCredit(member.spendable)}</td>
                      <td>
                        <button
                          type="button"
                          className="button button--outline button--small"
                          aria-expanded={selected === member.accountId}
                          onClick={() =>
                            setSelected((current) =>
                              current === member.accountId ? null : member.accountId,
                            )
                          }
                        >
                          {selected === member.accountId ? "닫기" : "보기"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected ? (
        <section className="admin-section">
          <AdminMemberDetailPanel accountId={selected} />
        </section>
      ) : null}
    </div>
  );
}
