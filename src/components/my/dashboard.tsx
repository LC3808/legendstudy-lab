'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useCreditSummary } from '@/components/credit-balance';
import { useAuth } from '@/components/auth-context';
import { OwnerArea, useOwnerData, DataStatus, dateLabel } from './owner-data';
import { readGoals, readHistory, readEssays, saveMajor, addTarget, editTarget, searchUniversities, majorOptions, assertOwner, type Goals, type Target } from '@/lib/my/data';

export function MyDashboard(){return <div className="my-dashboard content-wrap content-wrap--detail"><h1>마이페이지</h1><OwnerArea>
 <section className="my-surface"><h2>내 이용 현황</h2><Usage /></section>
 <section className="my-surface"><h2>나의 목표</h2><GoalsPanel /></section>
 <section className="my-surface"><h2>나의 지원 현황</h2><p>등록된 지원 내역이 없습니다.</p></section>
 <section className="my-surface"><h2>나의 논술 LAB</h2><EssayRecords compact /><Link className="text-link" href="/my/essays/">기록 보기 →</Link></section>
 <section className="my-surface"><h2>다른 LAB</h2><div className="button-row"><Link className="button button--outline" href="/score-analysis/">내신 LAB</Link><Link className="button button--outline" href="/exam-analysis/">모의·수능 LAB</Link></div></section>
 <section className="my-surface"><h2>계정 및 지원</h2><div className="button-row"><Link className="button button--outline" href="/account/settings/">계정 설정</Link><Link className="button button--outline" href="/support/">고객센터</Link></div></section>
 </OwnerArea></div>;}
function Usage(){
 const {state,reload}=useCreditSummary();
 return <>{state.status==='ready'?<><p className="my-credit-total">내 첨삭권 <strong>{state.value.spendable}개</strong></p><p>무료 {state.value.free} · 구매 {state.value.paid}{state.value.other>0&&` · 기타 ${state.value.other}`}</p>{state.value.next_expiry&&<p>가장 가까운 만료일 {dateLabel(state.value.next_expiry)}</p>}</>:<DataStatus error={state.status==='error'} reload={reload}/>}<div className="button-row"><Link className="button button--primary" href="/pricing/">첨삭권 구매</Link><Link className="button button--outline" href="/account/credits/">구매·사용 내역</Link></div></>;
}
function GoalsPanel(){
 const result=useOwnerData(readGoals);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 return <GoalsEditor key={JSON.stringify(result.data)} data={result.data} reload={result.reload}/>;
}
function GoalsEditor({data,reload}:{data:Goals;reload:()=>void}){
 const {client,user}=useAuth();const [major,setMajor]=useState(data.intended_major??'');const [query,setQuery]=useState('');
 const [results,setResults]=useState<{id:string;name:string}[]>([]);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function run(action:()=>Promise<void>,refresh=true){
  if(!client||!user||busy)return;setBusy(true);setMessage('');
  try{await assertOwner(client,user.id);await action();await assertOwner(client,user.id);if(refresh)reload();}
  catch{setMessage('처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');}finally{setBusy(false);}
 }
 return <div className="my-goals">
  <form onSubmit={e=>{e.preventDefault();void run(()=>saveMajor(client!,user!.id,major));}}><label>희망 전공 분야<select value={major} disabled={busy} onChange={e=>setMajor(e.target.value)}><option value="">아직 정하지 않았어요</option>{data.intended_major&&!majorOptions.includes(data.intended_major)&&<option>{data.intended_major}</option>}{majorOptions.map(v=><option key={v}>{v}</option>)}</select></label><button className="button button--outline" disabled={busy}>전공 분야 저장</button></form>
  <h3>관심 대학</h3>
  {data.targets.length===0&&<p>관심 대학을 추가해 보세요.</p>}
  {data.targets.map(t=><TargetEditor key={t.id} target={t} busy={busy} save={value=>run(()=>editTarget(client!,user!.id,t.id,value))}/>)}
  <form onSubmit={e=>{e.preventDefault();void run(async()=>{const values=await searchUniversities(client!,user!.id,query);await assertOwner(client!,user!.id);setResults(values);setMessage(values.length?'':'검색 결과가 없습니다.');},false);}}><label>대학 찾기<input value={query} maxLength={60} disabled={busy} onChange={e=>setQuery(e.target.value)}/></label><button className="button button--outline" disabled={busy||!query.trim()}>검색</button></form>
  {results.length>0&&<ul className="my-search-results">{results.map(u=><li key={u.id}><span>{u.name}</span><button className="button button--outline button--small" disabled={busy||data.targets.length>=5||data.targets.some(t=>t.university_id===u.id)} onClick={()=>void run(()=>addTarget(client!,user!.id,u.id))}>추가</button></li>)}</ul>}
  <p role="status">{message}</p>
 </div>;
}
function TargetEditor({target,busy,save}:{target:Target;busy:boolean;save:(value:string|null)=>Promise<void>}){
 const [division,setDivision]=useState(target.intended_division??'');
 return <form className="my-target" onSubmit={(e:FormEvent)=>{e.preventDefault();void save(division);}}><strong>{target.universities?.name??'관심 대학'}</strong><label>희망 학과·모집단위<input value={division} maxLength={120} disabled={busy} onChange={e=>setDivision(e.target.value)}/></label><div className="button-row"><button className="button button--outline button--small" disabled={busy}>학과 저장</button><button className="text-link" type="button" disabled={busy} onClick={()=>void save(null)}>삭제</button></div></form>;
}
export function CreditHistory(){
 const result=useOwnerData(readHistory);
 return <div className="my-dashboard content-wrap content-wrap--detail"><h1>구매·사용 내역</h1><OwnerArea path="/account/credits/"><section className="my-surface">{!result.data?<DataStatus error={result.error} reload={result.reload}/>:result.data.length===0?<p>아직 첨삭권 내역이 없습니다.</p>:<><p>최근 내역 · 최대 100개</p><ul className="my-record-list">{result.data.map(r=><li key={r.id}><div><strong>{r.label}</strong><p>{dateLabel(r.at)}</p></div><span>{r.delta>0?'+':''}{r.delta}개</span></li>)}</ul></>}<Link className="text-link" href="/account/">마이페이지 →</Link></section></OwnerArea></div>;
}
export function EssayRecords({compact=false}:{compact?:boolean}){
 const result=useOwnerData(readEssays);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 if(!result.data.length)return <p>아직 논술 기록이 없습니다.</p>;
 return <><p>최근 연습 기록 {result.data.length}개{result.data.length===50?' (최대 50개)':''}</p><div className="my-essay-records">{result.data.slice(0,compact?3:50).map(s=>{
  const latest=s.evaluations[0];const completed=s.evaluations.filter(e=>e.status==='completed'&&!e.invalidated_at);
  return <article key={s.id}><h3>{s.essay_questions?.essay_exams?.universities?.name??'논술 연습'}</h3><p>{s.essay_questions?.label??'논술 기록'} · 첨삭 완료 {completed.length}회</p><p>최근 활동 {dateLabel(latest?.requested_at??s.created_at)}</p>{!latest&&<p>평가 기록이 없습니다.</p>}{latest&&<p>{latest.invalidated_at?'평가를 다시 확인하고 있습니다.':latest.status==='completed'?'최근 평가 완료':latest.status==='failed'?'최근 평가 실패':latest.status==='cancelled'?'최근 평가 취소':'평가 진행 중'}</p>}
  {!compact&&completed.map(e=><details key={e.id}><summary>{dateLabel(e.completed_at??e.requested_at)} 평가 기록</summary>{[...e.essay_evaluation_dimensions].sort((a,b)=>a.display_order-b.display_order).map((d,i)=><div key={i}><p>{d.level_1_to_5===null?'단계 미제공':`평가 단계 ${d.level_1_to_5}/5`}</p><p>{d.explanation}</p></div>)}</details>)}
  </article>;
 })}</div></>;
}
export function MyEssays(){return <div className="my-dashboard content-wrap content-wrap--detail"><h1>나의 논술 기록</h1><OwnerArea path="/my/essays/"><section className="my-surface"><EssayRecords/><Link className="text-link" href="/account/">마이페이지 →</Link></section></OwnerArea></div>;}
export function AccountSettings(){const {user,signOut}=useAuth();const [busy,setBusy]=useState(false);const [error,setError]=useState(false);return <div className="my-dashboard content-wrap content-wrap--detail"><h1>계정 설정</h1><OwnerArea path="/account/settings/"><section className="my-surface"><p>{user?.email}</p><div className="button-row"><Link className="button button--outline" href="/forgot-password/">비밀번호 재설정</Link><Link className="button button--outline" href="/account-deletion/">계정 삭제 안내</Link><button className="button button--outline" disabled={busy} onClick={async()=>{setBusy(true);setError(false);try{await signOut();}catch{setError(true);}finally{setBusy(false);}}}>로그아웃</button></div>{error&&<p role="alert">로그아웃하지 못했습니다. 다시 시도해 주세요.</p>}</section></OwnerArea></div>;}
