'use client';

import {useState,type ReactNode} from 'react';
import {withdrawalDefaults,withdrawalStatuses,withdrawalErrors,type WithdrawalCursor,type WithdrawalFilters,type WithdrawalList,type WithdrawalDetail,type WithdrawalActivity} from '@/lib/admin/withdrawals';
import {formatDateTime,formatNumber} from '@/lib/admin/format';
import {AdminEmpty,AdminErrorPanel,AdminLoading,useAdminQuery} from './admin-surface';
import {AdminMembersView} from './admin-members-view';
import './withdrawals.css';

const phaseLabels:Record<string,string>={PERSONAL:'개인 기록',STORAGE:'첨부파일',PROVIDER:'외부 로그인 연결',FINANCE:'원장 개인정보 분리',AUTH:'인증 계정',VERIFY:'삭제 결과 확인',DONE:'완료'};
const dataLabels:Record<string,string>={retained:'유예기간 · 기존 기록 보존',erasing:'삭제 진행 중',erased:'개인 기록 삭제 완료',cancelled:'요청 취소'};
const time=(v:string|null,empty='기록 없음')=>v?formatDateTime(v):empty;
const number=(v:number|null)=>v===null?'미집계':formatNumber(v);
const duration=(v:number)=>`${formatNumber(Math.floor(v/3600000))}시간 ${Math.floor(v/60000)%60}분`;

export function AdminMembersWorkspace(){
 const [tab,setTab]=useState<'members'|'withdrawals'>('members');
 // A build-time switch can withdraw only this view; existing member management remains intact.
 const enabled=process.env.NEXT_PUBLIC_ADMIN_WITHDRAWALS_ENABLED!=='false';
 return <><nav className="withdrawal-tabs" aria-label="회원 관리 메뉴">
  <button type="button" aria-pressed={tab==='members'} onClick={()=>setTab('members')}>전체 회원</button>
  {enabled&&<button type="button" aria-pressed={tab==='withdrawals'} onClick={()=>setTab('withdrawals')}>탈퇴 관리</button>}
 </nav>{tab==='members'?<AdminMembersView/>:<AdminWithdrawalsView/>}</>;
}
function Value({label,children}:{label:string;children:ReactNode}){return <div><dt>{label}</dt><dd>{children}</dd></div>;}
function Activity({data:a}:{data:WithdrawalActivity}){
 const groups:{title:string;note:string;values:[string,ReactNode][]}[]=[
  {title:'공부 기록',note:'완료·동기화된 합산 대상 기록. 공부 시간은 중복 구간을 제외하고, 활동일은 KST 기준입니다.',values:[['누적 공부 시간',duration(a.study_ms)],['완료 기록',number(a.study_sessions)+'건'],['공부한 날',number(a.study_days)+'일'],['최근 공부',time(a.study_last)]]},
  {title:'모의고사 자동채점',note:'재응시는 제출에 각각 포함합니다. 응시 시험은 시험 ID의 중복을 제외합니다.',values:[['제출',number(a.mock_submissions)+'건'],['응시 시험',number(a.mock_exams)+'개'],['점수 기록',number(a.mock_scores)+'건'],['최근 채점',time(a.mock_last)]]},
  {title:'논술 LAB',note:'시험 회차 기준이며 문항별 평가 수와 합산하지 않습니다. 재첨삭은 이전 회차 연결 기준입니다. 무료 재첨삭과 이용권 사용을 합산하지 않으며, 사용 확정 이용권은 원래 지급 출처별로 구분합니다.',values:[['첨삭 요청 회차',number(a.essay_requests)+'회'],['완료 회차',number(a.essay_completed)+'회'],['재첨삭 회차',number(a.essay_rewrites)+'회'],['이용권 사용 확정',number(a.credits_consumed)+'개'],['유료 구매 이용권 사용',number(a.credits_paid)+'개'],['가입·이벤트 무료 이용권 사용',number(a.credits_free)+'개'],['관리자 지급·기타 이용권 사용',number(a.credits_other)+'개'],['최근 이용',time(a.essay_last)]]},
  {title:'학습자료',note:'열람 자료 수는 현재 최근 열람 기록 수입니다. 반복 클릭 횟수·전체 누적 조회수는 수집하지 않아 미집계로 표시합니다.',values:[['누적 조회 횟수',number(a.material_views)],['열람 자료 기록',number(a.viewed_materials)+'개'],['북마크',number(a.bookmarks)+'개'],['최근 자료 이용',time(a.material_last)]]},
  {title:'입시 기록',note:'현재 희망 대학·실제 지원은 별도 집계합니다. 학과·전형이 다른 지원은 각각 포함하고 정정된 결과 이벤트는 제외합니다.',values:[['희망 대학 기록',number(a.targets)+'건'],['실제 지원',number(a.applications)+'건'],['합격·불합격 결과가 있는 지원',number(a.outcome_applications)+'건']]},
  {title:'친구 초대',note:'링크 클릭과 가입을 합산하지 않습니다. 유효 가입 귀속과 가입 이후 공부 기록을 기존 초대 계약으로 확인합니다.',values:[['생성한 초대 링크',number(a.invite_links)+'개'],['가입 귀속',number(a.invite_signups)+'명'],['첫 공부 전환',number(a.invite_first_study)+'명']]},
 ];
 return <div className="withdrawal-activity">{groups.map(g=><section key={g.title} className="withdrawal-card"><h4>{g.title}</h4><dl className="withdrawal-values">{g.values.map(([label,v])=><Value key={label} label={label}>{v}</Value>)}</dl><p className="focus-note">{g.note}</p></section>)}</div>;
}
export function WithdrawalDetailPanel({requestId,onClose}:{requestId:string;onClose:()=>void}){
 const {state,reload}=useAdminQuery<WithdrawalDetail>(c=>c.withdrawalDetail(requestId),`withdrawal:${requestId}`);
 return <section className="withdrawal-detail" aria-label="탈퇴 요청 상세"><header><h3>탈퇴 요청 상세</h3><button className="button button--outline button--small" onClick={onClose}>상세 닫기</button></header>
 {state.status==='loading'?<AdminLoading label="탈퇴 요청을 확인하는 중입니다"/>:state.status==='error'?<AdminErrorPanel kind={state.kind} onRetry={reload}/>:<>
  <section className="withdrawal-card"><h4>삭제 처리 현황</h4><dl className="withdrawal-values">
   <Value label="요청일">{time(state.data.requested_at)}</Value><Value label="삭제 예정일">{time(state.data.scheduled_deletion_at)}</Value>
   <Value label="실제 처리 시작">{time(state.data.started_at,'미집계 · 시작 시각 기록 없음')}</Value>
   <Value label="완료일">{time(state.data.completed_at,'미완료')}</Value><Value label="현재 처리 단계">{state.data.state==='DELETION_PENDING'?'유예기간 · 처리 전':phaseLabels[state.data.phase]}</Value>
   <Value label="오류 발생 단계">{state.data.error?phaseLabels[state.data.phase]:'오류 없음'}</Value>
   <Value label="최근 오류">{state.data.error?withdrawalErrors[state.data.error]:'오류 없음'}</Value>
   <Value label="재시도 기록">{number(state.data.retry_count)}회</Value>
   <Value label="다음 처리 기준">{['DELETION_PENDING','ERASING'].includes(state.data.state)?time(state.data.next_attempt_at):'해당 없음'}</Value>
   {state.data.cancelled_at&&<Value label="취소일">{time(state.data.cancelled_at)}</Value>}
   {state.data.expires_at&&<Value label="감사 기록 보관 만료">{time(state.data.expires_at)}</Value>}
  </dl><p className="focus-note">처리 현황 조회 전용 · 기존 자동 삭제 절차를 따릅니다. 시각은 한국시간입니다.</p></section>
  {state.data.identity&&<section className="withdrawal-card"><h4>회원 기본 정보</h4><dl className="withdrawal-values">
   <Value label="내부 사용자 ID"><code>{state.data.identity.account_id}</code></Value><Value label="가입일">{time(state.data.identity.joined_at)}</Value>
   <Value label="학년·현재 상태">{state.data.identity.academic_status==='retaker'?'N수·검정고시 등':state.data.identity.grade?`고${state.data.identity.grade}`:'미입력'}</Value>
   <Value label="학교 등록">{state.data.identity.school_set?'등록':'미등록'}</Value>
   <Value label="최근 기록된 활동">{time(state.data.activity?.last_activity??null)}</Value>
  </dl></section>}
  {state.data.activity?<Activity data={state.data.activity}/>:<p className="withdrawal-notice">{state.data.state==='ERASING'?'삭제가 진행 중이므로 일부 남은 기록을 활동 전체로 표시하지 않습니다.':state.data.state==='ERASED'?'개인정보 삭제 완료 · 보관 중인 처리 감사 기록만 표시합니다.':'이 요청의 개인별 활동을 조회하지 않습니다.'}</p>}
 </>}
 </section>;
}
export function AdminWithdrawalsView(){
 const [draft,setDraft]=useState<WithdrawalFilters>(withdrawalDefaults),[filters,setFilters]=useState<WithdrawalFilters>(withdrawalDefaults);
 const [cursors,setCursors]=useState<(WithdrawalCursor|null)[]>([null]),[selected,setSelected]=useState<string|null>(null);
 const cursor=cursors.at(-1)??null;
 const {state,reload}=useAdminQuery<WithdrawalList>(c=>c.withdrawals(filters,{limit:10,offset:0,cursor}),JSON.stringify(['withdrawals',filters,cursor]));
 function resetPage(){setSelected(null);setCursors([null]);}
 return <div className="focused-admin member-directory withdrawal-view"><section className="admin-section">
  <div className="focus-toolbar"><h2>탈퇴 관리</h2><button type="button" onClick={()=>{resetPage();reload();}}>새로고침</button></div>
  <p className="focus-note">계정 상태 변경 없이 탈퇴 요청과 자동 처리 현황을 확인합니다.</p>
  {state.status==='ready'&&<><dl className="withdrawal-kpis">{([['pending','탈퇴 대기'],['processing','삭제 처리 중'],['failed','처리 오류'],['completed30','최근 30일 삭제 완료']] as const).map(([key,label])=><Value key={key} label={label}>{number(state.data.kpis[key])}{state.data.kpis[key]===null?'':'건'}</Value>)}</dl>
  <p className="focus-note">대기·진행·오류는 현재 보관된 요청 기준이며 서로 중복되지 않습니다. 완료는 최근 30일의 보관 중인 완료 감사 기록입니다. 조회 {time(state.data.as_of)}</p></>}
  <form className="withdrawal-filters" onSubmit={e=>{e.preventDefault();setFilters({...draft});resetPage();reload();}}>
   <label>내부 사용자 ID<input value={draft.query} maxLength={36} autoComplete="off" onChange={e=>setDraft({...draft,query:e.target.value})}/></label>
   <label>처리 상태<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as WithdrawalFilters['status']})}><option value="">전체 요청</option>{Object.entries(withdrawalStatuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label>정렬<select value={draft.sort} onChange={e=>setDraft({...draft,sort:e.target.value as WithdrawalFilters['sort']})}><option value="newest">최근 요청순</option><option value="oldest">오래된 요청순</option></select></label>
   <button className="button button--primary button--small">조회</button><button type="button" className="button button--outline button--small" onClick={()=>{setDraft(withdrawalDefaults);setFilters(withdrawalDefaults);resetPage();reload();}}>초기화</button>
  </form>
 </section>
 {state.status==='loading'?<AdminLoading label="탈퇴 요청을 조회하는 중입니다"/>:state.status==='error'?<AdminErrorPanel kind={state.kind} onRetry={reload}/>:<section className="admin-section">
  <h3>탈퇴 요청 {number(state.data.total)}건</h3>
  {!state.data.items.length?<AdminEmpty title="조건에 맞는 탈퇴 요청이 없습니다."/>:<div className="withdrawal-table-scroll" tabIndex={0} role="region" aria-label="탈퇴 요청 목록"><table className="admin-table--members"><thead><tr>{['내부 사용자 ID','가입일','요청일','삭제 예정일','처리 상태','데이터 처리','상세'].map(x=><th scope="col" key={x}>{x}</th>)}</tr></thead><tbody>{state.data.items.map(row=><tr key={row.request_id}>
   <td><code>{row.account_id??'개인 식별정보 미표시'}</code></td><td>{time(row.joined_at,'—')}</td><td>{time(row.requested_at)}</td><td>{time(row.scheduled_deletion_at)}</td>
   <td><span className={`withdrawal-chip withdrawal-chip--${row.status}`}>{withdrawalStatuses[row.status]}</span></td><td>{dataLabels[row.data_state]}</td>
   <td><button className="button button--outline button--small" aria-label={`${time(row.requested_at)} 요청 상세`} aria-expanded={selected===row.request_id} onClick={()=>setSelected(selected===row.request_id?null:row.request_id)}>보기</button></td>
  </tr>)}</tbody></table></div>}
  <nav className="admin-pager" aria-label="탈퇴 요청 페이지"><button className="button button--outline button--small" disabled={cursors.length===1} onClick={()=>{setSelected(null);setCursors(cursors.slice(0,-1));}}>이전</button><span>{cursors.length}페이지</span><button className="button button--outline button--small" disabled={!state.data.next_cursor} onClick={()=>{setSelected(null);setCursors([...cursors.map(c=>c??{as_of:state.data.next_cursor!.as_of,requested_at:null,request_id:null}),state.data.next_cursor]);}}>다음</button></nav>
 </section>}
 {selected&&<WithdrawalDetailPanel key={selected} requestId={selected} onClose={()=>setSelected(null)}/>}
 </div>;
}
