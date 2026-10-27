'use client';
import {RowActions} from './row-actions';
import Link from 'next/link';
import {CreditExpiry} from './credit-expiry';
import {ReturnNavigation} from './return-navigation';
import {LabCards} from './lab-cards';
import {ApplicationsPanel, type ApplicationSeed} from './applications';
import {StudySummaryPanel} from './study-summary';
import { ProfileHeaderView } from './profile-header';
import { EssayGrowthCard } from './essay-growth';
import { useState, type FormEvent, type ReactNode } from 'react';
import {showsApplications} from '@/lib/my/contract';
import { useCreditSummary } from '@/components/credit-balance';
import { useAuth } from '@/components/auth-context';
import { OwnerArea, useOwnerData, DataStatus, dateLabel } from './owner-data';
import { readMyProfile, readGoals, readHistory, readEssays, saveMajor, addTarget, editTarget, searchUniversities, majorOptions, assertOwner, type Goals, type Target } from '@/lib/my/data';

/** Owner MY order, existing shared identity and data contracts. */
export function MyDashboard(){

 return <div className="my-dashboard content-wrap content-wrap--detail">
  <header className="my-head">
   <h1>마이페이지</h1>
  </header>
  <OwnerArea>
   <ProfileColleges/>
   <section className="my-section" aria-labelledby="my-usage-title"><h2 id="my-usage-title">내 이용 현황</h2><Usage /></section>
   <section className="my-section" aria-labelledby="my-labs-title"><h2 id="my-labs-title">LAB</h2><LabCards /></section>
   <section className="my-section" aria-labelledby="my-growth-title"><h2 id="my-growth-title">나의 성장</h2><EssayGrowthCard compact /></section>
   <section className="my-section" aria-labelledby="my-study-title"><h2 id="my-study-title">나의 학습 시간</h2><StudySummaryPanel /></section>
   <section className="my-section my-section--last" aria-labelledby="my-account-title"><h2 id="my-account-title">계정 및 지원</h2>
    <div className="my-links"><Link className="button button--outline button--small" href="/account/settings/">계정 설정</Link><Link className="button button--outline button--small" href="/support/">고객센터</Link></div>
   </section>
  </OwnerArea>
 </div>;
}

export function ProfileColleges(){
 const profile=useOwnerData(readMyProfile,true);
 const [applicationSeed,setApplicationSeed]=useState<ApplicationSeed|null>(null);
 const eligible=showsApplications(profile.data);
 return <section className="my-section my-panel my-profile-colleges" aria-labelledby="my-profile-title">
  <h2 id="my-profile-title">나의 프로필</h2>
  {profile.data?<ProfileHeaderView profile={profile.data} reload={profile.reload}><GoalsPanel part="major"/></ProfileHeaderView>:<DataStatus error={profile.error} reload={profile.reload}/>}
  <div className="my-colleges-inner"><h2 id="my-colleges-title">나의 대학 관리</h2>
   <div className={`my-college-grid${eligible?'':' my-college-grid--interests'}`}>
    <div><GoalsPanel part="targets" onApply={eligible?setApplicationSeed:undefined}/></div>
    {eligible&&<div><h3>나의 대학 지원 현황</h3><ApplicationsPanel seed={applicationSeed} clearSeed={()=>setApplicationSeed(null)}/></div>}
   </div>
  </div>
 </section>;
}

/**
 * Usage is the one place a returning writer checks first, so it is a metric row
 * rather than a paragraph inside a large card. Only canonical `credit_summary()`
 * values are shown; a period entitlement has no authority yet, so no 이용권 metric
 * is invented here.
 */
export function Usage({balanceLabel="크레딧"}:{balanceLabel?:string}={}){
 const {state,reload}=useCreditSummary();
 if(state.status!=='ready')return <DataStatus error={state.status==='error'} reload={reload}/>;
 const value=state.value;
 return <>
  <div className="my-metrics">
   <article className="my-metric">
    <p className="my-metric__label">{balanceLabel}</p>
    <p className="my-metric__value">{value.spendable}<span className="my-metric__unit">개</span></p>
    <p className="my-metric__meta">무료 {value.free} · 구매 {value.paid} · 기타 지급 {value.other}</p>
   </article>
   <article className="my-metric">
    <p className="my-metric__label">만료 예정</p>
    <CreditExpiry at={value.next_expiry}/>
   </article>
  </div>
  <div className="my-actions"><Link className="button button--primary" href="/pricing/">크레딧 구매</Link><Link className="button button--outline" href="/account/credits/">구매·사용 내역</Link></div>
 </>;
}

type GoalsView = {part?:"major"|"targets";onApply?:(seed:ApplicationSeed)=>void};
function GoalsPanel({part,onApply}:GoalsView){
 const result=useOwnerData(readGoals);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 return <GoalsEditor key={JSON.stringify(result.data)} data={result.data} reload={result.reload} part={part} onApply={onApply}/>;
}

/**
 * Goals reads as a result, not as a form: the saved major and the saved target list
 * are the screen, and the university search only appears when the student asks for
 * it. `searchUniversities` / `addTarget` / `editTarget` are the existing handlers.
 */
export function GoalsEditor({data,reload,part,onApply}:{data:Goals;reload:()=>void}&GoalsView){
 const {client,user}=useAuth();const [major,setMajor]=useState(data.intended_major??'');const [query,setQuery]=useState('');const [editingMajor,setEditingMajor]=useState(false);
 const [selectedUniversity,setSelectedUniversity]=useState<{id:string;name:string}|null>(null);const [newDivision,setNewDivision]=useState('');
 const [results,setResults]=useState<{id:string;name:string}[]>([]);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [adding,setAdding]=useState(false);
 async function run(action:()=>Promise<void>,refresh=true){
  if(!client||!user||busy)return false;setBusy(true);setMessage('');
  try{await assertOwner(client,user.id);await action();await assertOwner(client,user.id);if(refresh)reload();return true;}
  catch{setMessage('처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');return false;}finally{setBusy(false);}
 }
 return <div className="my-goals">
  {part!=="targets"&&<div className="my-goal-row">
   <p className="my-goal-row__label">희망 전공</p>
   {editingMajor
    ?<form className="my-goal-form" onSubmit={async e=>{e.preventDefault();if(await run(()=>saveMajor(client!,user!.id,major)))setEditingMajor(false);}}><label>희망 전공 분야<select value={major} disabled={busy} onChange={e=>setMajor(e.target.value)}><option value="">아직 정하지 않았어요</option>{data.intended_major&&!majorOptions.includes(data.intended_major)&&<option>{data.intended_major}</option>}{majorOptions.map(v=><option key={v}>{v}</option>)}</select></label><div className="button-row"><button className="button button--outline button--small" disabled={busy}>저장</button><button className="text-link" type="button" disabled={busy} onClick={()=>{setMajor(data.intended_major??'');setEditingMajor(false);}}>취소</button></div></form>
    :<><p className="my-goal-row__value">{data.intended_major||'아직 정하지 않았어요'}</p><button className="button button--outline button--small" type="button" disabled={busy} onClick={()=>setEditingMajor(true)}>변경</button></>}
  </div>}

  {part!=="major"&&<div className="my-goal-block">
   <h3>관심 대학</h3>
   {data.targets.length===0&&<p className="my-empty">관심 대학을 추가해보세요.</p>}
   {data.targets.length>0&&<ol className="my-target-list">{data.targets.map(t=><li key={t.id}><TargetEditor target={t} onApply={onApply?()=>onApply({university:{id:t.university_id,name:t.universities?.name??"관심 대학"},division:t.intended_division??"",key:crypto.randomUUID()}):undefined} busy={busy} save={value=>run(()=>editTarget(client!,user!.id,t.id,value))}/></li>)}</ol>}
   {!adding
    ?<button type="button" className="button button--primary button--small" disabled={busy||data.targets.length>=5} onClick={()=>setAdding(true)}>+ 관심 대학 추가</button>
    :<div className="my-add-panel">
      <form className="my-goal-form" onSubmit={e=>{e.preventDefault();void run(async()=>{const values=await searchUniversities(client!,user!.id,query);await assertOwner(client!,user!.id);setResults(values);setMessage(values.length?'':'검색 결과가 없습니다.');},false);}}><label>대학 찾기<input value={query} maxLength={60} disabled={busy} onChange={e=>setQuery(e.target.value)} placeholder="대학 이름을 검색해 주세요"/></label><button className="button button--outline button--small" disabled={busy||!query.trim()}>검색</button></form>
      {results.length>0&&<ul className="my-search-results">{results.map(u=><li key={u.id}><span>{u.name}</span><button className="button button--outline button--small" disabled={busy||data.targets.length>=5||data.targets.some(t=>t.university_id===u.id)} onClick={()=>{setSelectedUniversity(u);setResults([]);}}>선택</button></li>)}</ul>}
      {selectedUniversity&&<form className="my-goal-form" onSubmit={async e=>{e.preventDefault();if(await run(()=>addTarget(client!,user!.id,selectedUniversity.id,newDivision))){setAdding(false);setSelectedUniversity(null);setNewDivision('');}}}><p>{selectedUniversity.name}</p><label>희망 학과·모집단위<input value={newDivision} maxLength={120} disabled={busy} onChange={e=>setNewDivision(e.target.value)}/></label><button className="button button--primary" disabled={busy}>저장</button></form>}
      <button type="button" className="text-link" disabled={busy} onClick={()=>{setAdding(false);setSelectedUniversity(null);setNewDivision('');setResults([]);setMessage('');}}>닫기</button>
     </div>}
  </div>}
  <p role="status" className="my-status">{message}</p>
 </div>;
}

export function TargetEditor({target,busy,save,onApply}:{target:Target;busy:boolean;save:(value:string|null)=>Promise<boolean>;onApply?:()=>void}) {
 const [division,setDivision]=useState(target.intended_division??'');
 const [editing,setEditing]=useState(false);
 return <article className="my-target">
  <p className="my-target__name">{target.universities?.name??'관심 대학'}</p>
  {editing ? <form onSubmit={async(e:FormEvent)=>{e.preventDefault();if(await save(division))setEditing(false);}}>
   <label>희망 학과·모집단위<input value={division} maxLength={120} disabled={busy} onChange={e=>setDivision(e.target.value)}/></label>
   <div className="button-row"><button className="button button--outline button--small" disabled={busy}>학과 저장</button><button className="text-link" type="button" disabled={busy} onClick={()=>{setDivision(target.intended_division??'');setEditing(false);}}>취소</button></div>
  </form> : <>
   <p className="my-target__division">{target.intended_division||'희망 학과 미설정'}</p>
   <div className="my-target-actions">
    {onApply&&<button className="button button--outline button--small" type="button" disabled={busy} onClick={onApply}>지원 추가</button>}
    <RowActions label={`${target.universities?.name??'관심 대학'} 관리`}>
     <button className="button button--outline button--small" type="button" disabled={busy} onClick={()=>setEditing(true)}>관심 대학 변경</button>
     <button className="button button--outline button--small my-danger" type="button" disabled={busy} onClick={()=>{if(window.confirm('이 관심 대학을 삭제할까요? 기존 지원 내역은 유지됩니다.'))void save(null);}}>관심 대학 삭제</button>
    </RowActions>
   </div>
  </>}
 </article>;
}

/**
 * 크레딧 내역 — the spendable balance a returning writer checks first, then the
 * canonical Ledger rows one page at a time. The balance, breakdown and soonest
 * expiry are the `credit_summary()` values exactly; nothing here attributes a
 * purchase expiry to a free grant, and the rows remain date / signed quantity /
 * user reason only.
 */
const CREDIT_PAGE_SIZE=10;
export function CreditHistory(){
 const result=useOwnerData(readHistory);
 const [page,setPage]=useState(0);
 const rows=result.data??[];
 const pageCount=Math.max(1,Math.ceil(rows.length/CREDIT_PAGE_SIZE));
 const current=Math.min(page,pageCount-1);
 const shown=rows.slice(current*CREDIT_PAGE_SIZE,current*CREDIT_PAGE_SIZE+CREDIT_PAGE_SIZE);
 return <div className="my-dashboard content-wrap content-wrap--detail">
  <header className="my-head"><h1>크레딧 내역</h1></header>
  <OwnerArea path="/account/credits/">
   <ReturnNavigation href="/account/" label="마이페이지"/>
   <CreditHistoryBalance/>
   <section className="my-panel">
    {!result.data
     ?<DataStatus error={result.error} reload={result.reload}/>
     :rows.length===0
      ?<p className="my-empty">아직 크레딧 내역이 없습니다.</p>
      :<>
        <p className="my-note">최근 내역 · 총 {rows.length}건{rows.length===100?' (최대 100건)':''}</p>
        <table className="user-credit-history"><caption className="sr-only">크레딧 구매·사용 내역</caption>
         <thead><tr><th scope="col">날짜</th><th scope="col">개수</th><th scope="col">사유</th></tr></thead>
         <tbody>{shown.map(r=><tr key={r.id}><td data-label="날짜">{dateLabel(r.at)}</td><td data-label="개수">{r.delta>0?'+':''}{r.delta} 크레딧</td><td data-label="사유">{r.label}</td></tr>)}</tbody>
        </table>
        {pageCount>1&&<nav className="my-pagination" aria-label="크레딧 내역 페이지">
         <button type="button" className="button button--outline button--small" disabled={current===0} onClick={()=>setPage(current-1)}>이전</button>
         <span className="my-pagination__status" aria-live="polite">{current+1} / {pageCount} 페이지</span>
         <button type="button" className="button button--outline button--small" disabled={current>=pageCount-1} onClick={()=>setPage(current+1)}>다음</button>
        </nav>}
       </>}
   </section>
  </OwnerArea>
 </div>;
}

function CreditHistoryBalance(){
 const {state,reload}=useCreditSummary();
 if(state.status!=='ready')return <div className="my-panel"><DataStatus error={state.status==='error'} reload={reload}/></div>;
 const v=state.value;
 return <div className="my-panel my-credit-summary">
  <div className="my-credit-summary__balance">
   <p className="my-metric__label">사용 가능한 크레딧</p>
   <p className="my-metric__value">{v.spendable}<span className="my-metric__unit">개</span></p>
   <p className="my-metric__meta">무료 {v.free} · 구매 {v.paid}{v.other>0?` · 기타 ${v.other}`:''}{v.next_expiry?` · 가장 가까운 만료 ${dateLabel(v.next_expiry)}`:''}</p>
  </div>
  <Link className="button button--primary" href="/pricing/">크레딧 구매</Link>
 </div>;
}

export function EssayRecords({compact=false,emptyAction=null}:{compact?:boolean;emptyAction?:ReactNode}){
 const result=useOwnerData(readEssays);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 if(!result.data.length)return <div className="my-empty-block"><p className="my-empty">아직 논술 기록이 없습니다.</p>{emptyAction}</div>;
 return <><p className="my-note">최근 연습 기록 {result.data.length}개{result.data.length===50?' (최대 50개)':''}</p><div className="my-essay-records">{result.data.slice(0,compact?3:50).map(s=>{
  const latest=s.evaluations[0];const completed=s.evaluations.filter(e=>e.status==='completed'&&!e.invalidated_at);
  return <article key={s.id}><h3>{s.essay_questions?.essay_exams?.universities?.name??'논술 연습'}</h3><p>{s.essay_questions?.label??'논술 기록'} · 첨삭 완료 {completed.length}회</p><p>최근 활동 {dateLabel(latest?.requested_at??s.created_at)}</p>{!latest&&<p>평가 기록이 없습니다.</p>}{latest&&<p>{latest.invalidated_at?'평가를 다시 확인하고 있습니다.':latest.status==='completed'?'최근 평가 완료':latest.status==='failed'?'최근 평가 실패':latest.status==='cancelled'?'최근 평가 취소':'평가 진행 중'}</p>}
  {!compact&&completed.map(e=><details key={e.id}><summary>{dateLabel(e.completed_at??e.requested_at)} 평가 기록</summary>{[...e.essay_evaluation_dimensions].sort((a,b)=>a.display_order-b.display_order).map((d,i)=><div key={i}><p>{d.level_1_to_5===null?'단계 미제공':`평가 단계 ${d.level_1_to_5}/5`}</p><p>{d.explanation}</p></div>)}</details>)}
  </article>;
 })}</div><Link className="text-link" href="/my/essays/">기록 보기 →</Link></>;
}

export function MyEssays(){return <div className="my-dashboard content-wrap content-wrap--detail"><header className="my-head"><h1>나의 첨삭 기록</h1></header><OwnerArea path="/my/essays/"><section className="my-panel"><EssayRecords/><Link className="text-link" href="/account/">마이페이지 →</Link></section></OwnerArea></div>;}
export function AccountSettings(){const {user,signOut}=useAuth();const [busy,setBusy]=useState(false);const [error,setError]=useState(false);return <div className="my-dashboard content-wrap content-wrap--detail"><header className="my-head"><h1>계정 설정</h1></header><OwnerArea path="/account/settings/"><section className="my-panel"><p className="my-identity__email">{user?.email}</p><div className="my-links"><Link className="button button--outline button--small" href="/forgot-password/">비밀번호 재설정</Link><Link className="button button--outline button--small" href="/account-deletion/">계정 삭제 안내</Link><button className="button button--outline button--small" disabled={busy} onClick={async()=>{setBusy(true);setError(false);try{await signOut();}catch{setError(true);}finally{setBusy(false);}}}>로그아웃</button></div>{error&&<p role="alert">로그아웃하지 못했습니다. 다시 시도해 주세요.</p>}</section></OwnerArea></div>;}