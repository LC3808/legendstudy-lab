"use client";

import { useState, type ReactNode } from "react";

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

const PAGE_LIMIT = 25;

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
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
        <DetailRow label="이메일" value={data.member.email ?? "-"} />
        <DetailRow label="가입일" value={formatDateTime(data.member.createdAt)} />
        <DetailRow label="이메일 인증" value={data.member.emailConfirmed === null ? "확인 불가" : data.member.emailConfirmed ? "완료" : "대기"} />
        <DetailRow label="로그인 방식" value={data.member.authProviders?.join(", ") || "확인 불가"} />
        <DetailRow label="표시 이름" value={data.member.displayName ?? "미입력"} />
        <DetailRow label="학년" value={gradeLabel(data.member.gradeLevel)} />
        <DetailRow label="학교" value={<AdminSchoolName office={data.member.schoolOfficeCode} school={data.member.schoolCode} />} />
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
      <Student360Panel accountId={accountId} />
    </div>
  );
}

const statusLabels:Record<string,string>={student:'재학생',retaker:'N수·검정고시 등',other:'기타'};
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
 return <div className="admin-stack">
  <section className="admin-section">
   <h2>회원 관리</h2>
   {state.status==='ready'&&<p>전체 {formatNumber(state.data.total)}명 · 조회 {formatNumber(state.data.filteredTotal)}명</p>}
   <form className="admin-search" onSubmit={e=>{e.preventDefault();apply();}}>
    <label className="admin-search__label" htmlFor="admin-member-query">이메일·이름·계정 ID 검색</label>
    <div className="admin-search__row"><input id="admin-member-query" className="admin-search__input" type="search" value={draft.query} maxLength={254} autoComplete="off" onChange={e=>change('query',e.target.value)}/></div>
    <div className="button-row">
     <label>계정 상태<select value={draft.accountState} onChange={e=>change('accountState',e.target.value)}><option value="">전체</option>{['NORMAL','DELETION_PENDING','ERASING','ERASED','CANCELLED'].map(x=><option key={x} value={x}>{accountStateLabel(x).label}</option>)}</select></label>
     <label>현재 상태<select value={draft.academicStatus} onChange={e=>change('academicStatus',e.target.value)}><option value="">전체</option>{Object.entries(statusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}<option value="unset">미설정</option></select></label>
     <label>학년<select value={draft.grade} onChange={e=>change('grade',e.target.value)}><option value="">전체</option>{[1,2,3].map(n=><option key={n} value={n}>{n}학년</option>)}</select></label>
     <label>정렬<select value={draft.sort} onChange={e=>change('sort',e.target.value as MemberFilters['sort'])}><option value="newest">최근 가입순</option><option value="oldest">오래된 가입순</option></select></label>
    </div>
    <fieldset><legend>학교 필터</legend>
     <label>학교 이름<input value={schoolQuery} maxLength={100} onChange={e=>setSchoolQuery(e.target.value)}/></label>
     <button type="button" className="button button--outline button--small" disabled={schoolBusy||!schoolQuery.trim()} onClick={()=>void findSchool()}>학교 검색</button>
     {schools.length>0&&<ul>{schools.map(s=><li key={s.office+':'+s.code}><button type="button" className="text-link" onClick={()=>{setDraft(d=>({...d,office:s.office,school:s.code,schoolUnset:false}));setSchoolLabel(s.name);setSchools([]);}}>{s.name} · {s.address}</button></li>)}</ul>}
     {draft.school&&<p>{schoolLabel}</p>}
     <label><input type="checkbox" checked={draft.schoolUnset} onChange={e=>setDraft(d=>({...d,schoolUnset:e.target.checked,office:'',school:''}))}/>학교 미설정</label>
     <button type="button" className="text-link" onClick={()=>{setDraft(d=>({...d,office:'',school:'',schoolUnset:false}));setSchoolLabel('');setSchools([]);}}>학교 필터 해제</button>
    </fieldset>
    <div className="button-row"><button className="button button--primary button--small">검색·필터 적용</button><button type="button" className="button button--outline button--small" onClick={()=>{setDraft(defaultMemberFilters);setFilters(defaultMemberFilters);setOffset(0);setSelected(null);setSchools([]);setSchoolLabel('');setSchoolQuery('');setHint('');reload();}}>초기화</button></div>
   </form>
   {hint&&<p role="status">{hint}</p>}
  </section>
  {state.status==='loading'?<AdminLoading label="회원 목록을 불러오는 중입니다"/>:state.status==='error'?<AdminErrorPanel kind={state.kind} onRetry={reload}/>:<section className="admin-section">
   {state.data.items.length===0?<AdminEmpty title={state.data.total===0?'등록된 회원이 없습니다':'조회 결과가 없습니다'} body="검색어와 필터를 확인하세요."/>:<div className="admin-table-scroll" tabIndex={0} role="region" aria-label="회원 목록">
    <table className="admin-table"><thead><tr>{['순번','회원','계정 상태','학교·학년 / 현재 상태','희망 전공','가입일','상세'].map(t=><th scope="col" key={t}>{t}</th>)}</tr></thead><tbody>
     {state.data.items.map((m,index)=><tr key={m.accountId}>
      <td>{formatNumber(state.data.offset+index+1)}</td>
      <td>{m.displayName&&<strong>{m.displayName}<br/></strong>}{m.email??'이메일 미등록'}</td>
      <td>{accountStateLabel(m.accountState).label}</td>
      <td>{directorySchoolLabel(m)}{m.grade?` · ${m.grade}학년`:''}<br/>{m.academicStatus?statusLabels[m.academicStatus]:'현재 상태 미설정'}</td>
      <td>{m.major??'미설정'}</td><td>{formatDateTime(m.createdAt)}</td>
      <td><button type="button" className="button button--outline button--small" aria-label={`${m.displayName||m.email||'회원'} 상세 ${selected===m.accountId?'닫기':'보기'}`} aria-expanded={selected===m.accountId} onClick={()=>setSelected(selected===m.accountId?null:m.accountId)}>{selected===m.accountId?'닫기':'보기'}</button></td>
     </tr>)}
    </tbody></table>
   </div>}
   <nav className="button-row" aria-label="회원 목록 페이지"><button className="button button--outline button--small" disabled={offset===0} onClick={()=>page(Math.max(0,offset-PAGE_LIMIT))}>이전</button><span>{Math.floor(offset/PAGE_LIMIT)+1}페이지</span><button className="button button--outline button--small" disabled={offset+PAGE_LIMIT>=state.data.filteredTotal} onClick={()=>page(offset+PAGE_LIMIT)}>다음</button></nav>
  </section>}
  {selected&&<section className="admin-section"><AdminMemberDetailPanel key={selected} accountId={selected}/></section>}
 </div>;
}
