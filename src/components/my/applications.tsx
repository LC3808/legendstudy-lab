'use client';
import {useCallback,useRef,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {useAuth} from '@/components/auth-context';
import {assertOwner,searchUniversities} from '@/lib/my/data';
import {addApplicationEvent,deleteApplication,eventLabels,readApplicationEvents,readApplicationPage,saveApplication,type Application,type ApplicationInput,type EventKind,type EventPage} from '@/lib/my/foundation';
import {DataStatus,dateLabel,useOwnerData} from './owner-data';

function useRequestKey(){
 const previous=useRef<{input:string;key:string}|null>(null);
 return (input:unknown)=>{const signature=JSON.stringify(input);if(previous.current?.input!==signature)previous.current={input:signature,key:crypto.randomUUID()};return previous.current.key;};
}
export function ApplicationsPanel(){
 const [offset,setOffset]=useState(0);
 const load=useCallback((client:SupabaseClient,owner:string)=>readApplicationPage(client,owner,offset),[offset]);
 const result=useOwnerData(load);
 if(!result.data)return <DataStatus error={result.error} reload={result.reload}/>;
 return <div className="my-panel">
  <Applications key={JSON.stringify(result.data)} items={result.data.items} reload={result.reload}/>
  {offset>0&&<button className="text-link" onClick={()=>setOffset(Math.max(0,offset-25))}>이전</button>}
  {result.data.has_more&&<button className="text-link" onClick={()=>setOffset(offset+25)}>다음</button>}
 </div>;
}
function Applications({items,reload}:{items:Application[];reload:()=>void}){
 const [adding,setAdding]=useState(false);
 return <>
  {items.length===0&&<p className="my-empty">등록된 지원 내역이 없습니다.</p>}
  {items.map(a=><ApplicationCard key={a.id} application={a} reload={reload}/>)}
  {adding?<ApplicationForm done={reload} cancel={()=>setAdding(false)}/>:<button className="button button--outline button--small" onClick={()=>setAdding(true)}>지원 내역 추가</button>}
 </>;
}
function ApplicationForm({application,done,cancel}:{application?:Application;done:()=>void;cancel:()=>void}){
 const {client,user}=useAuth();const requestKey=useRequestKey();
 const [university,setUniversity]=useState(application?{id:application.university_id,name:application.university_name_snapshot}:null);
 const [query,setQuery]=useState('');const [results,setResults]=useState<{id:string;name:string}[]>([]);
 const [year,setYear]=useState(application?.admission_year.toString()??'');const [division,setDivision]=useState(application?.intended_division??'');
 const [type,setType]=useState(application?.admission_type??'');const [name,setName]=useState(application?.admission_name??'');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function search(e:FormEvent){e.preventDefault();if(!client||!user||busy)return;setBusy(true);setError('');try{const rows=await searchUniversities(client,user.id,query);await assertOwner(client,user.id);setResults(rows);if(!rows.length)setError('검색 결과가 없습니다.');}catch{setError('대학을 검색하지 못했습니다. 다시 시도해 주세요.');}finally{setBusy(false);}}
 async function save(e:FormEvent){e.preventDefault();if(!client||!user||!university||busy)return;setBusy(true);setError('');
  const input:ApplicationInput={id:application?.id??null,revision:application?.revision??0,year:Number(year),university:university.id,division,admissionType:type,admissionName:name};
  try{await saveApplication(client,user.id,input,requestKey(input));done();}catch(e){setError(e instanceof Error&&e.message==='APPLICATION_CHANGED'?'다른 화면에서 변경되었습니다. 새로고침 후 다시 확인해 주세요.':'저장하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.');}finally{setBusy(false);}
 }
 return <div className="my-add-panel">
  <form className="my-goal-form" onSubmit={search}><label>지원 대학 검색<input value={query} maxLength={60} onChange={e=>setQuery(e.target.value)} disabled={busy}/></label><button disabled={busy||!query.trim()} className="button button--outline button--small">검색</button></form>
  {results.length>0&&<ul className="my-search-results">{results.map(u=><li key={u.id}>{u.name} <button type="button" disabled={busy} className="text-link" onClick={()=>{setUniversity(u);setResults([]);}}>선택</button></li>)}</ul>}
  <form className="my-goal-form" onSubmit={save}>
   <p>{university?.name??'지원 대학을 선택해 주세요.'}</p>
   <label>입학 연도<input type="number" min={1900} max={2200} required value={year} onChange={e=>setYear(e.target.value)} disabled={busy}/></label>
   <label>지원 학과·모집단위<input maxLength={120} required value={division} onChange={e=>setDivision(e.target.value)} disabled={busy}/></label>
   <label>모집 구분<input maxLength={80} required placeholder="예: 수시, 정시" value={type} onChange={e=>setType(e.target.value)} disabled={busy}/></label>
   <label>전형 이름<input maxLength={120} required value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label>
   <div className="button-row"><button disabled={busy||!university} className="button button--outline button--small">저장</button><button type="button" disabled={busy} className="text-link" onClick={cancel}>취소</button></div>
  </form>
  {error&&<p role="alert">{error}</p>}
 </div>;
}
function ApplicationCard({application:a,reload}:{application:Application;reload:()=>void}){
 const {client,user}=useAuth();const requestKey=useRequestKey();const [editing,setEditing]=useState(false);
 const [history,setHistory]=useState<EventPage|null>(null);const [kind,setKind]=useState<EventKind>('submitted');const [occurred,setOccurred]=useState('');const [supersedes,setSupersedes]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [showEvent,setShowEvent]=useState(false);
 async function run(action:()=>Promise<void>){if(busy||!client||!user)return;setBusy(true);setError('');try{await assertOwner(client,user.id);await action();await assertOwner(client,user.id);}catch{setError('처리하지 못했습니다. 다시 시도해 주세요.');}finally{setBusy(false);}}
 async function loadHistory(offset=0){await run(async()=>setHistory(await readApplicationEvents(client!,user!.id,a.id,offset)));}
 if(editing)return <ApplicationForm application={a} done={reload} cancel={()=>setEditing(false)}/>;
 return <article className="my-target-card">
  <h3>{a.university_name_snapshot} · {a.intended_division}</h3>
  <p>{a.admission_year}학년도 · {a.admission_type} · {a.admission_name}</p>
  <p>{a.latest_event&&a.latest_event.kind in eventLabels?eventLabels[a.latest_event.kind as EventKind]:'결과 미입력'}</p>
  <div className="button-row"><button disabled={busy} className="text-link" onClick={()=>setEditing(true)}>변경</button><button disabled={busy} className="text-link" onClick={()=>setShowEvent(!showEvent)}>진행·결과 기록</button><button disabled={busy} className="text-link" onClick={()=>void loadHistory()}>이력 보기</button><button disabled={busy} className="text-link" onClick={()=>{if(window.confirm('이 지원 내역과 기록한 이력을 삭제할까요?'))void run(async()=>{await deleteApplication(client!,user!.id,a.id);reload();});}}>삭제</button></div>
  {showEvent&&<form className="my-goal-form" onSubmit={e=>{e.preventDefault();const at=occurred?new Date(`${occurred}+09:00`).toISOString():null;void run(async()=>{await addApplicationEvent(client!,user!.id,a.id,kind,at,supersedes,requestKey({kind,at,supersedes}));reload();});}}>
   <label>진행·결과<select disabled={busy} value={kind} onChange={e=>setKind(e.target.value as EventKind)}>{Object.entries(eventLabels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
   <label>발생 일시 (선택, 한국 시간)<input disabled={busy} type="datetime-local" value={occurred} onChange={e=>setOccurred(e.target.value)}/></label>
   {supersedes&&<p>선택한 이력을 정정합니다. 이전 기록도 보존됩니다.</p>}
   <button disabled={busy} className="button button--outline button--small">기록 저장</button>
  </form>}
  {history&&<div><h4>기록 이력</h4><ul>{history.items.map(event=><li key={event.id}>
   {event.kind==='created'?'지원 내역 생성':event.kind==='details_changed'?'지원 정보 변경':eventLabels[event.kind]} · 기록 {dateLabel(event.recorded_at)}{event.occurred_at?` · 발생 ${dateLabel(event.occurred_at)}`:''}{event.supersedes_event_id?' · 정정 기록':''}
   {event.kind in eventLabels&&<button disabled={busy} className="text-link" onClick={()=>{setKind(event.kind as EventKind);setSupersedes(event.id);setShowEvent(true);}}>정정</button>}
  </li>)}</ul>{history.offset>0&&<button disabled={busy} className="text-link" onClick={()=>void loadHistory(history.offset-100)}>이전 이력</button>}{history.has_more&&<button disabled={busy} className="text-link" onClick={()=>void loadHistory(history.offset+100)}>다음 이력</button>}</div>}
  {error&&<p role="alert">{error}</p>}
 </article>;
}
