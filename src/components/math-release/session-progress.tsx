'use client';
import {useRef,useState} from 'react';
import {useAuth} from '../auth-context';
import {assertOwner} from '@/lib/my/data';
import {readMathSession,type MathSession} from '@/lib/my/essay-dashboard';
import {temporaryDraftStore} from '@/lib/temporary-draft-store';

/** Resumes only stored evaluations; a failed generation requires an explicit retry. */
export function MathSessionProgress({run,onChange}:{run:MathSession;onChange:()=>void}){
 const {client,user}=useAuth();const running=useRef(false);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const retryable=run.state==='reserved'&&run.questions.some(q=>q.state==='FAILED')&&run.questions.every(q=>['FAILED','COMPLETED'].includes(q.state));
 async function resume(retry:boolean){
  if(!client||!user||running.current)return;
  running.current=true;setBusy(true);setNotice('');
  const owner=user.id,scope=`legendstudy:essay-source-draft:v1:${owner}:math-session-retry:${run.run_id}`;
  try{
   let current=await readMathSession(client,owner,run.run_id);
   if(retry){
    const key=temporaryDraftStore.read(scope)||crypto.randomUUID();temporaryDraftStore.write(scope,key);
    await assertOwner(client,owner);
    const response=await client.rpc('math_session_retry',{p_run:run.run_id,p_key:key}).abortSignal(AbortSignal.timeout(20000));
    await assertOwner(client,owner);if(response.error)throw Error('RETRY_UNCONFIRMED');
    temporaryDraftStore.remove(scope);
    current=await readMathSession(client,owner,run.run_id);
   }
   for(const q of current.questions){
    if(q.state!=='REQUESTED')continue;
    await assertOwner(client,owner);
    const session=(await client.auth.getSession()).data.session;
    if(session?.user.id!==owner)throw Error('ACCOUNT_CHANGED');
    try{await fetch('/api/math/evaluate',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({evaluation_id:q.evaluation_id}),signal:AbortSignal.timeout(100000)});}catch{/* Read stored status before a failed-only retry. */}
    await assertOwner(client,owner);
   }
   await readMathSession(client,owner,run.run_id);
   window.dispatchEvent(new Event('legendstudy:credit-refresh'));
   onChange();
  }catch{setNotice('처리 상태를 확인하지 못했어요. 기존 회차와 성공한 결과는 유지됩니다. 다시 상태를 확인해 주세요.');}
  finally{running.current=false;setBusy(false);}
 }
 return <div aria-busy={busy}><button className="button button--outline" disabled={busy} onClick={()=>void resume(false)}>같은 회차 상태 확인</button>{retryable&&<button className="button button--outline" disabled={busy} onClick={()=>void resume(true)}>실패 문항만 재처리 · 0 크레딧</button>}<p role="status">{notice}</p></div>;
}
