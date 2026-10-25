"use client";

import {AdminLearningSummary} from './admin-learning-summary';
import { Fragment, useState, type ReactNode } from "react";

import type { AdminMemberDetail } from "@/lib/admin/contract";
import {defaultMemberFilters,directorySchoolLabel,type MemberDirectory,type MemberFilters} from "@/lib/admin/members";
import {searchSchools,type SchoolOption} from "@/lib/admin/school";
import {
  accountStateLabel,
  formatDateTime,
  formatNumber,
  gradeLabel,
} from "@/lib/admin/format";

import { AdminEmpty, AdminErrorPanel, AdminLoading, useAdminQuery } from "./admin-surface";
import { AdminMemberCreditPanel } from "./admin-member-credit-panel";

import {Student360Panel} from "./student360-panel";
import { AdminSchoolName } from "./admin-school-name";

// Owner directive §5B: one page shows ten members.
const PAGE_LIMIT = 10;
// How many numbered page buttons to show around the current page.
const PAGE_WINDOW = 2;

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="admin-detail__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * Member detail.
 *
 * Owner directive §5D: 학교·학년·현재 상태·희망 전공 are shown only when the
 * database actually holds a value, so a half-filled profile does not read as a
 * wall of "미설정". §5E groups the detail into 기본정보 / 학교·학년 / 학습정보 /
 * Credit / 결제 / 논술 첨삭 기록 with a divider and spacing between each block.
 *
 * The queried 계정 식별자 is shown so an operator can cross-check a member whose
 * Credit or 논술 기록 looks empty against the canonical record (see the §6/§7
 * read-path notes). It is the id this screen passed to every member RPC.
 */
function AdminMemberDetailPanel({ accountId }: { accountId: string }) {
  const { state, reload } = useAdminQuery<AdminMemberDetail>(
    (client) => client.memberDetail(accountId),
    `detail:${accountId}`,
  );

  if (state.status === "loading") return <AdminLoading label="회원 정보를 불러오는 중입니다" />;
  if (state.status === "error") return <AdminErrorPanel kind={state.kind} onRetry={reload} />;

  const data = state.data;
  const member = data.member;
  const state_ = accountStateLabel(data.account.state);
  const hasGrade = member.gradeLevel !== null && member.gradeLevel !== undefined;
  const hasSchool = member.schoolCode !== null || member.schoolOfficeCode !== null;
  const hasMajor = Boolean(member.intendedMajor);
  const targets = member.targetUniversities ?? [];
  const hasTargets = targets.length > 0;

  return (
    <div className="admin-detail">
      <div className="admin-detail__title">
        <h3>회원 상세</h3>
        <p className="admin-detail__id" aria-label="조회 중인 계정 식별자">
          계정 ID <code>{accountId}</code>
        </p>
      </div>

      <section className="admin-detail__block">
        <h4 className="admin-subhead">기본 정보</h4>
        <dl className="admin-detail__grid">
          <DetailRow label="이메일" value={member.email ?? "-"} />
          <DetailRow label="가입일" value={formatDateTime(member.createdAt)} />
          <DetailRow label="이메일 인증" value={member.emailConfirmed === null ? "확인 불가" : member.emailConfirmed ? "완료" : "대기"} />
          <DetailRow label="로그인 방식" value={member.authProviders?.join(", ") || "확인 불가"} />
          {member.displayName ? <DetailRow label="표시 이름" value={member.displayName} /> : null}
        </dl>
      </section>

      {hasGrade || hasSchool || hasMajor || hasTargets ? (
        <section className="admin-detail__block">
          <h4 className="admin-subhead">학교·학년</h4>
          <dl className="admin-detail__grid">
            {hasGrade ? <DetailRow label="학년" value={gradeLabel(member.gradeLevel)} /> : null}
            {hasSchool ? <DetailRow label="학교" value={<AdminSchoolName office={member.schoolOfficeCode} school={member.schoolCode} />} /> : null}
            {hasMajor ? <DetailRow label="희망 전공" value={member.intendedMajor} /> : null}
            {hasTargets ? (
              <DetailRow
                label="관심 대학·학과"
                value={targets.map((t) => `${t.universityName}${t.intendedDivision ? ` · ${t.intendedDivision}` : ""}`).join(", ")}
              />
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="admin-detail__block">
        <h4 className="admin-subhead">계정 상태</h4>
        <p className="admin-state">
          <span className={`admin-state__badge admin-state__badge--${state_.tone}`}>{state_.label}</span>
          <span className="admin-muted">{data.account.state}</span>
        </p>
        {data.account.deletion ? (
          <dl className="admin-detail__grid">
            <DetailRow label="요청 단계" value={data.account.deletion.phase} />
            <DetailRow label="요청일" value={formatDateTime(data.account.deletion.requestedAt)} />
            <DetailRow label="예정일" value={formatDateTime(data.account.deletion.scheduledDeletionAt)} />
            <DetailRow label="완료일" value={formatDateTime(data.account.deletion.completedAt)} />
          </dl>
        ) : (
          <p className="admin-muted">진행 중인 계정 삭제 요청이 없습니다.</p>
        )}
      </section>

      <section className="admin-detail__block">
        <h4 className="admin-subhead">학습 정보</h4>
        <AdminLearningSummary subject={accountId}/>
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
            <p className="admin-metric__label">이전 단일 문항 인문 기록</p>
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
              기존 수리 문항 기록 · 회차 현황은 위 집계 참조
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
      </section>

      <section className="admin-detail__block">
        <AdminMemberCreditPanel key={accountId} accountId={accountId} email={member.email} />
      </section>

      <section className="admin-detail__block">
        <Student360Panel accountId={accountId} />
      </section>
    </div>
  );
}

const statusLabels:Record<string,string>={student:'재학생',retaker:'N수·검정고시 등',other:'기타'};

function MemberPager({ offset, filteredTotal, onPage }: { offset: number; filteredTotal: number; onPage: (next: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(filteredTotal / PAGE_LIMIT));
  const current = Math.floor(offset / PAGE_LIMIT);
  const first = Math.max(0, current - PAGE_WINDOW);
  const last = Math.min(pageCount - 1, current + PAGE_WINDOW);
  const pages: number[] = [];
  for (let page = first; page <= last; page += 1) pages.push(page);
  return (
    <nav className="admin-pager" aria-label="회원 목록 페이지">
      <button className="button button--outline button--small" disabled={current === 0} onClick={() => onPage(Math.max(0, offset - PAGE_LIMIT))}>
        이전
      </button>
      <ul className="admin-pager__pages">
        {first > 0 ? (
          <li>
            <button className="admin-pager__page" onClick={() => onPage(0)} aria-label="1페이지">1</button>
            {first > 1 ? <span className="admin-pager__gap" aria-hidden="true">…</span> : null}
          </li>
        ) : null}
        {pages.map((page) => (
          <li key={page}>
            <button
              className={`admin-pager__page${page === current ? " admin-pager__page--active" : ""}`}
              aria-current={page === current ? "page" : undefined}
              aria-label={`${page + 1}페이지`}
              onClick={() => onPage(page * PAGE_LIMIT)}
            >
              {page + 1}
            </button>
          </li>
        ))}
        {last < pageCount - 1 ? (
          <li>
            {last < pageCount - 2 ? <span className="admin-pager__gap" aria-hidden="true">…</span> : null}
            <button className="admin-pager__page" onClick={() => onPage((pageCount - 1) * PAGE_LIMIT)} aria-label={`${pageCount}페이지`}>{pageCount}</button>
          </li>
        ) : null}
      </ul>
      <button className="button button--outline button--small" disabled={offset + PAGE_LIMIT >= filteredTotal} onClick={() => onPage(offset + PAGE_LIMIT)}>
        다음
      </button>
    </nav>
  );
}

export function AdminMembersView() {
 const [draft,setDraft]=useState<MemberFilters>(defaultMemberFilters);
 const [filters,setFilters]=useState<MemberFilters>(defaultMemberFilters);
 const [offset,setOffset]=useState(0);const [selected,setSelected]=useState<string|null>(null);
 const [schoolQuery,setSchoolQuery]=useState('');const [schools,setSchools]=useState<SchoolOption[]>([]);
 const [schoolLabel,setSchoolLabel]=useState('');const [schoolBusy,setSchoolBusy]=useState(false);const [hint,setHint]=useState('');
 const {state,reload}=useAdminQuery<MemberDirectory>(client=>client.listMembers(filters,{limit:PAGE_LIMIT,offset}),JSON.stringify([filters,offset]));
 const change=<K extends keyof MemberFilters>(key:K,value:MemberFilters[K])=>setDraft(d=>({...d,[key]:value}));
 function apply(){setFilters({...draft});setOffset(0);setSelected(null);reload();}
 function page(next:number){setOffset(next);setSelected(null);}
 async function findSchool(){setSchoolBusy(true);setHint('');try{const result=await searchSchools(schoolQuery);setSchools(result);if(!result.length)setHint('학교 검색 결과가 없습니다.');}catch{setHint('학교 검색을 처리하지 못했습니다. 다시 시도해 주세요.');}finally{setSchoolBusy(false);}}
 const columns=['순번','회원','계정 상태','학교·학년 / 현재 상태','희망 전공','가입일','상세'];
 return <div className="admin-stack">
  <section className="admin-section">
   <h2>회원 관리</h2>
   {state.status==='ready'&&<p className="admin-section__note">전체 {formatNumber(state.data.total)}명 · 조회 {formatNumber(state.data.filteredTotal)}명</p>}
   <form className="admin-search admin-filters" onSubmit={e=>{e.preventDefault();apply();}}>
    <label className="admin-search__label" htmlFor="admin-member-query">이메일·이름·계정 ID 검색</label>
    <div className="admin-search__row"><input id="admin-member-query" className="admin-search__input" type="search" value={draft.query} maxLength={254} autoComplete="off" onChange={e=>change('query',e.target.value)}/></div>
    <div className="admin-filters__row">
     <label className="admin-field">계정 상태<select className="admin-select" value={draft.accountState} onChange={e=>change('accountState',e.target.value)}><option value="">전체</option>{['NORMAL','DELETION_PENDING','ERASING','ERASED','CANCELLED'].map(x=><option key={x} value={x}>{accountStateLabel(x).label}</option>)}</select></label>
     <label className="admin-field">현재 상태<select className="admin-select" value={draft.academicStatus} onChange={e=>change('academicStatus',e.target.value)}><option value="">전체</option>{Object.entries(statusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}<option value="unset">미설정</option></select></label>
     <label className="admin-field">학년<select className="admin-select" value={draft.grade} onChange={e=>change('grade',e.target.value)}><option value="">전체</option>{[1,2,3].map(n=><option key={n} value={n}>{n}학년</option>)}</select></label>
     <label className="admin-field">정렬<select className="admin-select" value={draft.sort} onChange={e=>change('sort',e.target.value as MemberFilters['sort'])}><option value="newest">최근 가입순</option><option value="oldest">오래된 가입순</option></select></label>
    </div>
    <fieldset className="admin-fieldset"><legend>학교 필터</legend>
     <div className="admin-filters__school">
      <label className="admin-field admin-field--grow">학교 이름<input className="admin-select" value={schoolQuery} maxLength={100} onChange={e=>setSchoolQuery(e.target.value)}/></label>
      <button type="button" className="button button--outline button--small" disabled={schoolBusy||!schoolQuery.trim()} onClick={()=>void findSchool()}>학교 검색</button>
     </div>
     {schools.length>0&&<ul className="admin-school-options">{schools.map(s=><li key={s.office+':'+s.code}><button type="button" className="text-link" onClick={()=>{setDraft(d=>({...d,office:s.office,school:s.code,schoolUnset:false}));setSchoolLabel(s.name);setSchools([]);}}>{s.name} · {s.address}</button></li>)}</ul>}
     {draft.school&&<p className="admin-muted">{schoolLabel}</p>}
     <div className="admin-filters__school">
      <label className="admin-checkbox"><input type="checkbox" checked={draft.schoolUnset} onChange={e=>setDraft(d=>({...d,schoolUnset:e.target.checked,office:'',school:''}))}/>학교 미설정만 보기</label>
      <button type="button" className="text-link" onClick={()=>{setDraft(d=>({...d,office:'',school:'',schoolUnset:false}));setSchoolLabel('');setSchools([]);}}>학교 필터 해제</button>
     </div>
    </fieldset>
    <div className="admin-filters__actions"><button className="button button--primary button--small">검색·필터 적용</button><button type="button" className="button button--ghost button--small" onClick={()=>{setDraft(defaultMemberFilters);setFilters(defaultMemberFilters);setOffset(0);setSelected(null);setSchools([]);setSchoolLabel('');setSchoolQuery('');setHint('');reload();}}>필터 초기화</button></div>
   </form>
   {hint&&<p className="admin-hint" role="status">{hint}</p>}
  </section>
  {state.status==='loading'?<AdminLoading label="회원 목록을 불러오는 중입니다"/>:state.status==='error'?<AdminErrorPanel kind={state.kind} onRetry={reload}/>:<section className="admin-section">
   {state.data.items.length===0?<AdminEmpty title={state.data.total===0?'등록된 회원이 없습니다':'조회 결과가 없습니다'} body="검색어와 필터를 확인하세요."/>:<div className="admin-table-scroll" tabIndex={0} role="region" aria-label="회원 목록">
    <table className="admin-table admin-table--members"><thead><tr>{columns.map(t=><th scope="col" key={t}>{t}</th>)}</tr></thead><tbody>
     {state.data.items.map((m,index)=>{
      const open=selected===m.accountId;
      return <Fragment key={m.accountId}>
       <tr className={open?'admin-member-row admin-member-row--open':'admin-member-row'}>
        <td>{formatNumber(state.data.offset+index+1)}</td>
        <td>{m.displayName&&<strong>{m.displayName}<br/></strong>}{m.email??'이메일 미등록'}</td>
        <td>{accountStateLabel(m.accountState).label}</td>
        <td>{[directorySchoolLabel(m),m.grade?`${m.grade}학년`:''].filter(Boolean).join(' · ')}<br/><span className="admin-muted">{m.academicStatus?statusLabels[m.academicStatus]:''}</span></td>
        <td>{m.major??''}</td><td>{formatDateTime(m.createdAt)}</td>
        <td><button type="button" className="button button--outline button--small" aria-label={`${m.displayName||m.email||'회원'} 상세 ${open?'닫기':'보기'}`} aria-expanded={open} onClick={()=>setSelected(open?null:m.accountId)}>{open?'닫기':'보기'}</button></td>
       </tr>
       {open?<tr className="admin-member-detail-row"><td colSpan={columns.length}><AdminMemberDetailPanel key={m.accountId} accountId={m.accountId}/></td></tr>:null}
      </Fragment>;
     })}
    </tbody></table>
   </div>}
   {state.data.items.length>0?<MemberPager offset={offset} filteredTotal={state.data.filteredTotal} onPage={page}/>:null}
  </section>}
 </div>;
}
