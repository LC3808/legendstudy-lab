'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useAuth} from './auth-context';
import {EssayDraftSession} from './essay-draft-session';
import {readEssayDashboard,readMathDashboard} from '@/lib/my/essay-dashboard';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
import './essay-studio.css';
type DraftSession={id:string;at:string};
export const examHistoryHref=(id:string)=>`/my/essays/?exam=${encodeURIComponent(id)}`;
function sessions(key:string):DraftSession[]{const rows=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(rows))throw Error('INVALID_DRAFT_INDEX');return rows.filter(r=>typeof r.id==='string'&&/^[0-9a-f-]{36}$/i.test(r.id)&&typeof r.at==='string');}
/** Owner/exam keyed by the parent; stale history requests cannot choose another exam. */
export function ExamReentryGate({exam,children}:{exam:SourceExam;children:ReactNode}){
 const {client,user}=useAuth();const owner=user?.id;
 const key=`legendstudy:essay-draft-sessions:v1:${owner}:${exam.dbExamId}`;
 const [state,setState]=useState<'loading'|'choose'|'writing'|'error'>('loading');
 const [scope,setScope]=useState(''),[saved,setSaved]=useState<DraftSession[]>([]),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{let active=true;
  void(async()=>{
   if(!client||!owner||!exam.dbExamId){if(active)setState('writing');return;}
   const [essay,math]=await Promise.all([readEssayDashboard(client,owner),readMathDashboard(client,owner)]);
   if(!active)return;
   const previous=[...essay,...math].some(r=>r.examId===exam.dbExamId&&r.evaluations.some(e=>e.valid));
   const stored=sessions(key);setSaved(stored);
   if(previous){setScope(crypto.randomUUID());setState('choose');}
   else {setScope(stored.at(-1)?.id??'');setState('writing');}
  })().catch(()=>{if(active)setState('error');});
  return()=>{active=false;};
 },[client,owner,exam.dbExamId,key,retry]);
 useEffect(()=>{if(state==='choose'&&!dialog.current?.open)dialog.current?.showModal();},[state]);
 function start(){try{const next=[...sessions(key),{id:scope,at:new Date().toISOString()}];localStorage.setItem(key,JSON.stringify(next));setSaved(next);setState('writing');}catch{setError('새 초안을 저장할 수 없습니다. 브라우저 저장 공간을 확인해 주세요. 기존 초안은 유지됩니다.');}}
 if(state==='loading')return <p role="status">이 시험의 첨삭 기록을 확인하고 있어요.</p>;
 if(state==='error')return <p role="alert">기존 기록을 확인할 수 없습니다. <button onClick={()=>{setState('loading');setRetry(v=>v+1);}}>다시 시도</button></p>;
 return <>
  {state==='writing'&&scope&&<p className="essay-submit-note">독립된 새 답안입니다. 저장은 무료이며 신규 첨삭은 1 Credit입니다. 기존 결과의 무료 재첨삭은 <a href={examHistoryHref(exam.dbExamId!)}>이 시험의 기록</a>에서 재작성하기를 선택해 주세요. 새 초안은 이 브라우저에 저장됩니다.</p>}
  {state==='writing'&&saved.length>0&&<details><summary>이 브라우저에 보관된 답안 이어쓰기</summary><p>기존 초안과 제출 기록을 삭제하지 않고 선택한 작성 세션을 엽니다.</p><select aria-label="보관된 작성 세션" value={scope} onChange={e=>{const next=e.currentTarget.value;if(window.confirm('현재 답안이 저장되었는지 확인한 뒤 작성 세션을 바꿀까요?'))setScope(next);}}><option value="">기존 작성 세션</option>{saved.map((s,i)=><option key={s.id} value={s.id}>별도 초안 {i+1} · {new Date(s.at).toLocaleString('ko-KR')}</option>)}</select></details>}
  <div inert={state==='choose'}><EssayDraftSession.Provider key={scope} value={scope}>{children}</EssayDraftSession.Provider></div>
  {state==='choose'&&<dialog ref={dialog} className="essay-progress-dialog essay-reentry-dialog" aria-labelledby="exam-reentry-title" onCancel={e=>e.preventDefault()}><h2 id="exam-reentry-title">이전에 첨삭한 시험입니다.</h2><p>이 시험의 첨삭 기록이 있습니다.<br/>이전 결과를 확인하시겠습니까?</p><div className="essay-progress-actions"><a className="button button--outline" href={examHistoryHref(exam.dbExamId!)}>네, 기록 확인</a><button autoFocus className="button button--primary" onClick={start}>아니오, 새로 작성</button></div>{error&&<p role="alert">{error}</p>}</dialog>}
 </>;
}
