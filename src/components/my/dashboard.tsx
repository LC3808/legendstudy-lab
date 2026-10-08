'use client';
import Link from 'next/link';
import { ProfileEditor } from './profile-editor';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useCreditSummary } from '@/components/credit-balance';
import { useAuth } from '@/components/auth-context';
import { OwnerArea, useOwnerData, DataStatus, dateLabel } from './owner-data';
import { readMyProfile, readGoals, readHistory, readEssays, saveMajor, addTarget, editTarget, searchUniversities, majorOptions, assertOwner, type Goals, type Target } from '@/lib/my/data';

/**
 * MY dashboard — presentation only.
 *
 * The screen is a 입시·학습 dashboard, not a settings form: identity first, then the
 * usage state a returning writer checks, then school/grade, goals, application,
 * 논술 LAB and the remaining navigation. Every read and write below is the existing
 * `src/lib/my/data.ts` handler, unchanged; this file only decides what is on screen,
 * in which order, and at what visual weight.
 *
 * Sections are not all the same white card. `내 이용 현황` is a metric row, the
 * record sections carry a surface, and navigation sections stay flat, so importance
 * is readable at a glance instead of every block shouting at the same volume.
 */
export function MyDashboard(){
 return <div className="my-dashboard content-wrap content-wrap--detail">
  <header className="my-head">
   <h1>마이페이지</h1>
   <Identity />
  </header>
  <OwnerArea>
   <section className="my-section" aria-labelledby="my-usage-title"><h2 id="my-usage-title">내 이용 현황</h2><Usage /></section>
   <section className="my-section" aria-labelledby="my-school-title"><h2 id="my-school-title">나의 학교·학년</h2><div className="my-panel"><CurrentProfile /></div></section>
   <section className="my-section" aria-labelledby="my-goals-title"><h2 id="my-goals-title">나의 목표</h2><div className="my-panel"><GoalsPanel /></div></section>
   <section className="my-section" aria-labelledby="my-application-title"><h2 id="my-application-title">나의 지원 현황</h2><p className="my-empty">등록된 지원 내역이 없습니다.</p></section>
   <section className="my-section" aria-labelledby="my-essay-title"><h2 id="my-essay-title">나의 논술 LAB</h2><EssayRecords compact emptyAction={<Link className="button button--primary button--small" href="/essay-lab/">논술 LAB 시작하기</Link>} /></section>
   <section className="my-section" aria-labelledby="my-labs-title"><h2 id="my-labs-title">다른 LAB</h2>
    <nav className="my-nav-grid" aria-label="다른 LAB 바로가기">
     <Link className="my-nav-card" href="/score-analysis/"><strong>내신 LAB</strong><span>과목별 성적과 변화에서 강점과 보완점을 확인합니다.</span></Link>
     <Link className="my-nav-card" href="/exam-analysis/"><strong>모의·수능 LAB</strong><span>성적의 변화와 현재 위치를 확인합니다.</span></Link>
    </nav>
   </section>
   <section className="my-section my-section--last" aria-labelledby="my-account-title"><h2 id="my-account-title">계정 및 지원</h2>
    <div className="my-links"><Link className="button button--outline button--small" href="/account/settings/">계정 설정</Link><Link className="button button--outline button--small" href="/support/">고객센터</Link></div>
   </section>
  </OwnerArea>
 </div>;
}

/** The only identity the Web app holds today. No nickname field exists for Web accounts. */
function Identity(){
 const {user}=useAuth();
 if(!user?.email)return null;
 return <p className="my-identity"><span className="my-identity__email">{user.email}</span></p>;
}

function CurrentProfile(){
 const result=useOwnerData(readMyProfile);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 return <ProfileEditor key={JSON.stringify(result.data)} profile={result.data} reload={result.reload}/>;
}

/**
 * Usage is the one place a returning writer checks first, so it is a metric row
 * rather than a paragraph inside a large card. Only canonical `credit_summary()`
 * values are shown; a period entitlement has no authority yet, so no 이용권 metric
 * is invented here.
 */
function Usage(){
 const {state,reload}=useCreditSummary();
 if(state.status!=='ready')return <DataStatus error={state.status==='error'} reload={reload}/>;
 const value=state.value;
 return <>
  <div className="my-metrics">
   <article className="my-metric">
    <p className="my-metric__label">첨삭권</p>
    <p className="my-metric__value">{value.spendable}<span className="my-metric__unit">개</span></p>
    <p className="my-metric__meta">무료 {value.free} · 구매 {value.paid}{value.other>0?` · 기타 ${value.other}`:''}</p>
   </article>
   <article className="my-metric">
    <p className="my-metric__label">만료 예정</p>
    <p className="my-metric__value my-metric__value--date">{value.next_expiry?dateLabel(value.next_expiry):'없음'}</p>
    <p className="my-metric__meta">{value.next_expiry?'가장 가까운 만료일':'만료 예정 없음'}</p>
   </article>
  </div>
  <div className="my-actions"><Link className="button button--primary" href="/pricing/">첨삭권 구매</Link><Link className="button button--outline" href="/account/credits/">구매·사용 내역</Link></div>
 </>;
}

function GoalsPanel(){
 const result=useOwnerData(readGoals);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 return <GoalsEditor key={JSON.stringify(result.data)} data={result.data} reload={result.reload}/>;
}

/**
 * Goals reads as a result, not as a form: the saved major and the saved target list
 * are the screen, and the university search only appears when the student asks for
 * it. `searchUniversities` / `addTarget` / `editTarget` are the existing handlers.
 */
export function GoalsEditor({data,reload}:{data:Goals;reload:()=>void}){
 const {client,user}=useAuth();const [major,setMajor]=useState(data.intended_major??'');const [query,setQuery]=useState('');const [editingMajor,setEditingMajor]=useState(false);
 const [results,setResults]=useState<{id:string;name:string}[]>([]);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [adding,setAdding]=useState(false);
 async function run(action:()=>Promise<void>,refresh=true){
  if(!client||!user||busy)return false;setBusy(true);setMessage('');
  try{await assertOwner(client,user.id);await action();await assertOwner(client,user.id);if(refresh)reload();return true;}
  catch{setMessage('처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');return false;}finally{setBusy(false);}
 }
 return <div className="my-goals">
  <div className="my-goal-row">
   <p className="my-goal-row__label">희망 전공</p>
   {editingMajor
    ?<form className="my-goal-form" onSubmit={async e=>{e.preventDefault();if(await run(()=>saveMajor(client!,user!.id,major)))setEditingMajor(false);}}><label>희망 전공 분야<select value={major} disabled={busy} onChange={e=>setMajor(e.target.value)}><option value="">아직 정하지 않았어요</option>{data.intended_major&&!majorOptions.includes(data.intended_major)&&<option>{data.intended_major}</option>}{majorOptions.map(v=><option key={v}>{v}</option>)}</select></label><div className="button-row"><button className="button button--outline button--small" disabled={busy}>저장</button><button className="text-link" type="button" disabled={busy} onClick={()=>{setMajor(data.intended_major??'');setEditingMajor(false);}}>취소</button></div></form>
    :<><p className="my-goal-row__value">{data.intended_major||'아직 정하지 않았어요'}</p><button className="button button--outline button--small" type="button" disabled={busy} onClick={()=>setEditingMajor(true)}>변경</button></>}
  </div>

  <div className="my-goal-block">
   <h3>관심 대학</h3>
   {data.targets.length===0&&<p className="my-empty">관심 대학을 추가해보세요.</p>}
   {data.targets.length>0&&<div className="my-target-grid">{data.targets.map(t=><TargetEditor key={t.id} target={t} busy={busy} save={value=>run(()=>editTarget(client!,user!.id,t.id,value))}/>)}</div>}
   {!adding
    ?<button type="button" className="button button--outline button--small" disabled={busy||data.targets.length>=5} onClick={()=>setAdding(true)}>+ 대학·학과 추가</button>
    :<div className="my-add-panel">
      <form className="my-goal-form" onSubmit={e=>{e.preventDefault();void run(async()=>{const values=await searchUniversities(client!,user!.id,query);await assertOwner(client!,user!.id);setResults(values);setMessage(values.length?'':'검색 결과가 없습니다.');},false);}}><label>대학 찾기<input value={query} maxLength={60} disabled={busy} onChange={e=>setQuery(e.target.value)} placeholder="대학 이름을 검색해 주세요"/></label><button className="button button--outline button--small" disabled={busy||!query.trim()}>검색</button></form>
      {results.length>0&&<ul className="my-search-results">{results.map(u=><li key={u.id}><span>{u.name}</span><button className="button button--outline button--small" disabled={busy||data.targets.length>=5||data.targets.some(t=>t.university_id===u.id)} onClick={()=>void run(()=>addTarget(client!,user!.id,u.id))}>추가</button></li>)}</ul>}
      <button type="button" className="text-link" disabled={busy} onClick={()=>{setAdding(false);setResults([]);setMessage('');}}>닫기</button>
     </div>}
   <p role="status" className="my-status">{message}</p>
  </div>
 </div>;
}

export function TargetEditor({target,busy,save}:{target:Target;busy:boolean;save:(value:string|null)=>Promise<boolean>}){
 const [division,setDivision]=useState(target.intended_division??'');const [editing,setEditing]=useState(false);
 return <article className="my-target"><p className="my-target__name">{target.universities?.name??'관심 대학'}</p>{editing ? <form onSubmit={async(e:FormEvent)=>{e.preventDefault();if(await save(division))setEditing(false);}}><label>희망 학과·모집단위<input value={division} maxLength={120} disabled={busy} onChange={e=>setDivision(e.target.value)}/></label><div className="button-row"><button className="button button--outline button--small" disabled={busy}>학과 저장</button><button className="text-link" type="button" disabled={busy} onClick={()=>{setDivision(target.intended_division??'');setEditing(false);}}>취소</button></div></form> : <><p className="my-target__division">{target.intended_division||'희망 학과 미설정'}</p><div className="button-row"><button className="button button--outline button--small" type="button" disabled={busy} onClick={()=>setEditing(true)}>변경</button><button className="text-link" type="button" disabled={busy} onClick={()=>void save(null)}>삭제</button></div></>}</article>;
}

export function CreditHistory(){
 const result=useOwnerData(readHistory);
 return <div className="my-dashboard content-wrap content-wrap--detail"><header className="my-head"><h1>구매·사용 내역</h1></header><OwnerArea path="/account/credits/"><section className="my-panel">{!result.data?<DataStatus error={result.error} reload={result.reload}/>:result.data.length===0?<p className="my-empty">아직 첨삭권 내역이 없습니다.</p>:<><p className="my-note">최근 내역 · 최대 100개</p><ul className="my-record-list">{result.data.map(r=><li key={r.id}><div><strong>{r.label}</strong><p>{dateLabel(r.at)}</p></div><span>{r.delta>0?'+':''}{r.delta}개</span></li>)}</ul></>}<Link className="text-link" href="/account/">마이페이지 →</Link></section></OwnerArea></div>;
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

export function MyEssays(){return <div className="my-dashboard content-wrap content-wrap--detail"><header className="my-head"><h1>나의 논술 기록</h1></header><OwnerArea path="/my/essays/"><section className="my-panel"><EssayRecords/><Link className="text-link" href="/account/">마이페이지 →</Link></section></OwnerArea></div>;}
export function AccountSettings(){const {user,signOut}=useAuth();const [busy,setBusy]=useState(false);const [error,setError]=useState(false);return <div className="my-dashboard content-wrap content-wrap--detail"><header className="my-head"><h1>계정 설정</h1></header><OwnerArea path="/account/settings/"><section className="my-panel"><p className="my-identity__email">{user?.email}</p><div className="my-links"><Link className="button button--outline button--small" href="/forgot-password/">비밀번호 재설정</Link><Link className="button button--outline button--small" href="/account-deletion/">계정 삭제 안내</Link><button className="button button--outline button--small" disabled={busy} onClick={async()=>{setBusy(true);setError(false);try{await signOut();}catch{setError(true);}finally{setBusy(false);}}}>로그아웃</button></div>{error&&<p role="alert">로그아웃하지 못했습니다. 다시 시도해 주세요.</p>}</section></OwnerArea></div>;}