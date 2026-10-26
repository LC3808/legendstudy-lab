'use client';
import {allQuestionsCompleted} from '@/lib/my/essay-result-route';
import {EssayProgressDialog} from '../essay-progress-dialog';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {useOwnerData,DataStatus} from './owner-data';
import {assertOwner} from '@/lib/my/data';
import {useAuth} from '../auth-context';
import {examQuestionLabel} from '@/lib/my/exam-history';

type Progress={version:string;run_id:string;exam_id:string;state:string;retry_allowed:boolean;questions:{question_id:string;state:string}[]};
export function EssaySessionProgress({runId,onComplete,presentation,hidden=false}:{runId:string;onComplete:()=>void;hidden?:boolean;presentation?:{onClose:()=>void;onResult:()=>void}}){
 const auth=useAuth(),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[retryDialog,setRetryDialog]=useState(false);
 const key=useRef<string|null>(null),completedRun=useRef<string|null>(null),retryLock=useRef(false);
 const load=useCallback(async(client:SupabaseClient,owner:string)=>{
  await assertOwner(client,owner);
  const {data,error}=await client.rpc('essay_exam_session_status',{p_run:runId});
  await assertOwner(client,owner);
  if(error||data?.version!=='exam-session-v1'||data.run_id!==runId||!Array.isArray(data.questions))throw Error('READ_FAILED');
  return data as Progress;
 },[runId]);
 const result=useOwnerData(load),reload=result.reload;
 useEffect(()=>{if(result.data&&allQuestionsCompleted(result.data.state,result.data.questions)){if(completedRun.current!==runId){completedRun.current=runId;onComplete();}return;}const timer=setInterval(reload,10000);return()=>clearInterval(timer);},[result.data,onComplete,reload,runId]);
 async function retry(){
  if(!auth.client||!auth.user||!result.data?.retry_allowed||retryLock.current)return;
  retryLock.current=true;setBusy(true);setRetryDialog(true);setNotice('재처리 요청을 접수하고 있습니다.');key.current??=crypto.randomUUID();
  try{
   const {data}=await auth.client.auth.getSession();if(data.session?.user.id!==auth.user.id)throw Error('OWNER_CHANGED');
   const response=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'retry',examId:result.data.exam_id,runId,key:key.current}),cache:'no-store'});
   if(!response.ok)throw Error('RETRY_UNAVAILABLE');
   key.current=null;setNotice('실패한 문항을 다시 처리합니다. 추가 크레딧은 사용되지 않습니다.');reload();
  }catch{setNotice('처리 상태를 확인하지 못했습니다. 기록을 새로 확인한 뒤 같은 요청을 다시 확인해 주세요.');}
  finally{retryLock.current=false;setBusy(false);}
 }
 const retryButton=result.data?.retry_allowed&&<button type="button" className="button essay-retry-button" disabled={busy} onClick={()=>void retry()}>{busy?'재처리 요청 중…':'다시 시도 · 0 크레딧'}</button>;
 const progressDialog=<EssayProgressDialog state={result.data?.state??'processing'} retrying={busy} error={!!result.error} questions={result.data?.questions.map(q=>({id:q.question_id,label:examQuestionLabel(q.question_id),state:q.state}))} onClose={()=>{setRetryDialog(false);presentation?.onClose();}} onResult={presentation?.onResult??onComplete}>{retryButton}<button type="button" className="button button--outline" onClick={reload}>상태 새로 확인</button>{notice&&<p role="status">{notice}</p>}</EssayProgressDialog>;
 if(retryDialog||presentation&&!hidden)return progressDialog;
 if(hidden)return retryButton?<div className="essay-retry-notice"><p>실패한 문항만 다시 처리합니다. 완료된 결과는 보존되며 추가 크레딧은 사용하지 않습니다.</p>{retryButton}</div>:null;
 if(!result.data)return <DataStatus error={result.error} reload={reload}/>;
 const labels:Record<string,string>={completed:'첨삭 완료',failed:'재처리 필요',processing:'첨삭 중',waiting:'대기 중',reconciling:'처리 상태 확인 중'};
 return <section className="my-panel"><h3>회차 처리 상태</h3><ul>{result.data.questions.map(q=><li key={q.question_id}>{examQuestionLabel(q.question_id)} · {labels[q.state]??'처리 상태 확인 중'}</li>)}</ul><p>완료된 문항의 결과는 보존됩니다.</p>{retryButton}<button type="button" className="button button--outline" onClick={()=>setRetryDialog(true)}>첨삭 진행 상태 보기</button><button type="button" className="button button--outline" onClick={reload}>상태 새로 확인</button>{notice&&<p role="status">{notice}</p>}</section>;
}
