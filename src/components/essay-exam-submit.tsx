'use client';
import {essayRestMessages} from './essay-progress-dialog';
import {EssaySessionProgress} from './my/essay-session-progress';
import './essay-studio.css';
import {useEffect,useState,useRef,useCallback} from 'react';
import Link from 'next/link';
import {pendingStorageKey,restorePending,savePending,type PendingRequest} from '@/lib/essay-runtime/pending-request';
import {useAuth} from './auth-context';
import {temporaryDraftStore} from '@/lib/temporary-draft-store';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
import {openEssayResult} from '@/lib/my/essay-result-route';
import {readExamRuns,readExamDashboard} from '@/lib/my/exam-history';
export type SubmissionDraft={body:string;revision:number;images:boolean;saved?:boolean;mathInput?:{attemptId:string;confirmedRunId:string}};
export function EssayExamSubmit({exam,included,drafts,cycle,mathQuestions=[],inputBlocked=false}:{inputBlocked?:boolean;mathQuestions?:string[];cycle?:{parentId?:string;previousPaidRunId?:string};exam:SourceExam;included:string[];drafts:Record<string,SubmissionDraft>}){
 const confirmation=useRef<((accepted:boolean)=>void)|null>(null);
 const [confirmCost,setConfirmCost]=useState<number|null>(null);
 const missing=exam.questions.filter(q=>!included.includes(q.key));
 const unwritten=missing.filter(q=>!drafts[q.key]?.body.trim()&&!drafts[q.key]?.images);
 const omitted=missing.filter(q=>drafts[q.key]?.body.trim()||drafts[q.key]?.images);
 function confirmSubmission(cost:number){setConfirmCost(cost);return new Promise<boolean>(resolve=>{confirmation.current=resolve;});}
 function resolveConfirmation(value:boolean){confirmation.current?.(value);confirmation.current=null;setConfirmCost(null);}
 useEffect(()=>()=>{confirmation.current?.(false);},[]);
 const [admissionError,setAdmissionError]=useState(false),[admissionRetry,setAdmissionRetry]=useState(0);
 const auth=useAuth();const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [parentId,setParentId]=useState(cycle?.parentId??''),[rewrites,setRewrites]=useState<Record<string,unknown>[]>([]);
 const owner=auth.user?.id;
 const legacyStorage=`legendstudy:essay-exam-request:v1:${owner??'guest'}:${exam.key}:${cycle?.previousPaidRunId?`additional:${cycle.previousPaidRunId}`:parentId||'initial'}`;
 const requestStorage=pendingStorageKey(legacyStorage,exam.questions.filter(q=>included.includes(q.key)).map(q=>q.dbQuestionId??q.key));
 const [accepted,setAccepted]=useState<{id:string;owner:string;examId:string;scope:string;started:number}|null>(null);
 const acceptedHere=!!accepted&&accepted.owner===owner&&accepted.examId===exam.dbExamId&&accepted.scope===requestStorage;
 const [showProgress,setShowProgress]=useState(false);
 const refreshResult=useCallback(()=>{if(acceptedHere&&accepted?.id){window.dispatchEvent(new CustomEvent('essay-history-changed',{detail:{owner}}));openEssayResult('exam',accepted.id);}},[owner,acceptedHere,accepted]);
 const [waitMessage,setWaitMessage]=useState('');
 const [watching,setWatching]=useState(false);
 useEffect(()=>{if(!owner||!exam.dbExamId)return;let active=true;
  queueMicrotask(()=>{if(!active)return;try{const value=JSON.parse(temporaryDraftStore.read(requestStorage+':accepted')||'null');
   if(value?.owner===owner&&value.examId===exam.dbExamId&&value.scope===requestStorage&&typeof value.id==='string'&&value.id){setAccepted({...value,started:Date.now()});setWatching(true);}
  }catch{/* Existing request and History remain authoritative. */}});return()=>{active=false;};
 },[owner,exam.dbExamId,requestStorage]);
 useEffect(()=>{if(!busy&&!watching)return;const messages=essayRestMessages;let index=0;
  const timer=setInterval(()=>setWaitMessage(messages[++index%messages.length]),10000);
  return()=>{clearInterval(timer);};
 },[busy,watching]);
 useEffect(()=>{
  if(!accepted||!acceptedHere||!auth.client)return;
  const client=auth.client;let active=true,timer:ReturnType<typeof setTimeout>|undefined;
  async function poll(){
   try{const rows=await readExamDashboard(client,accepted!.owner);if(!active)return;
    const row=rows.find(r=>r.id===accepted!.id);
    const status=row?.evaluations[0]?.status;
    if(status==='completed'||status==='failed'){setWatching(false);
     window.dispatchEvent(new CustomEvent('essay-history-changed',{detail:{owner:accepted!.owner}}));
     setNotice(status==='completed'?'첨삭이 완료됐어요. 저장된 결과를 확인하세요.':'첨삭을 완료하지 못했어요. 기록에서 처리 상태를 확인해 주세요.');return;
    }
    setNotice(row?'첨삭 중입니다. 화면을 닫아도 제출 기록은 유지됩니다.':'제출 기록을 확인하고 있어요. 평가를 다시 요청하지 않습니다.');
   }catch{if(!active)return;setNotice('처리 상태를 확인하지 못했어요. 제출 기록은 보존됩니다.');}
   if(Date.now()-accepted!.started>=100000){setWatching(false);setNotice('평가 완료를 아직 확인하지 못했어요. 다시 제출하지 말고 나의 첨삭 기록에서 상태를 확인해 주세요.');return;}
   timer=setTimeout(()=>void poll(),3000);
  }
  void poll();return()=>{active=false;if(timer)clearTimeout(timer);};
 },[accepted,acceptedHere,auth.client]);

 async function credential(){const s=(await auth.client?.auth.getSession())?.data.session;if(!s||s.user.id!==owner)throw Error('LOGIN_REQUIRED');return s.access_token;}
 useEffect(()=>{let active=true;void(async()=>{setReady(false);setAdmissionError(false);if(!auth.client||!owner||!exam.dbExamId)return;
  const s=(await auth.client.auth.getSession()).data.session;if(!s||s.user.id!==owner)return;
  const response=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'availability',examId:exam.dbExamId}),cache:'no-store'});
  if(!response.ok)throw Error('ADMISSION_UNAVAILABLE');
  if(active)setReady((await response.json()).ready===true);
  const history=await readExamRuns(auth.client,owner);if(active)setRewrites(history.filter(r=>r.exam_id===exam.dbExamId&&r.free_rewrite_available===true));
 })().catch(()=>{if(active)setAdmissionError(true);});return()=>{active=false;};},[auth.client,owner,exam.dbExamId,admissionRetry]);
 async function submit(){if(busy||!ready||acceptedHere||inputBlocked)return;setWaitMessage('오늘도 수고했어요.');setBusy(true);setNotice('답안을 제출하고 있어요.');
  try{const selected=exam.questions.filter(q=>included.includes(q.key));
   if(!selected.length||selected.some(q=>drafts[q.key]?.saved===false||!q.dbQuestionId||
    (drafts[q.key]?.mathInput?!mathQuestions.includes(q.dbQuestionId):(!drafts[q.key]?.body.trim()||drafts[q.key]?.images||q.inputMode==='image'&&!mathQuestions.includes(q.dbQuestionId)))))throw Error('ANSWER_REQUIRED');
   const answers:PendingRequest['answers']=selected.map(q=>({questionId:q.dbQuestionId!,revision:drafts[q.key].revision,
    ...(drafts[q.key].mathInput?{mathInput:drafts[q.key].mathInput}:{body:drafts[q.key].body})}));
   const fingerprint=JSON.stringify({owner,examId:exam.dbExamId,parentId,previousPaidRunId:cycle?.previousPaidRunId,answers:answers.map(({questionId,body,mathInput})=>({questionId,...(mathInput?{mathInput}:{body})}))});
   // Keep the same key after ambiguous transport; changing answers requires resolution first.
   let pending:PendingRequest|null=restorePending(temporaryDraftStore,legacyStorage,answers.map(a=>a.questionId));
   if(pending&&pending.fingerprint!==fingerprint)throw Error('PENDING_CHANGED');
   if(!pending){
   const quoteResponse=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${await credential()}`,'Content-Type':'application/json'},body:JSON.stringify({action:'quote',examId:exam.dbExamId,questionIds:answers.map(a=>a.questionId),parentId:parentId||null,previousPaidRunId:cycle?.previousPaidRunId}),cache:'no-store'});
   if(!quoteResponse.ok){const failure=await quoteResponse.json().catch(()=>null);throw Error(failure?.code??'QUOTE_UNAVAILABLE');}
   const quote=await quoteResponse.json();if(quote.version!=='essay-exam-quote-v1'||quote.credits!==(parentId?0:1))throw Error('QUOTE_UNAVAILABLE');
   if(!await confirmSubmission(quote.credits)){setNotice('답안을 계속 작성할 수 있습니다.');return;}
   }
   pending??={fingerprint,key:crypto.randomUUID(),answers};
   savePending(temporaryDraftStore,legacyStorage,pending);
   const started=Date.now();
   const response=await fetch('/api/essay/exam',{method:'POST',headers:{Authorization:`Bearer ${await credential()}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(100000),body:JSON.stringify({action:'submit',examId:exam.dbExamId,key:pending.key,answers:pending.answers,parentId:parentId||null,previousPaidRunId:cycle?.previousPaidRunId}),cache:'no-store'});
   const data=await response.json();
   if(!response.ok){if(response.status===402||response.status===422){temporaryDraftStore.write(requestStorage,'null');}throw Error(data.code);}
   if(typeof data.runId!=='string'||!data.runId)throw Error('STATUS_UNKNOWN');
   const receipt={id:data.runId,owner:owner!,examId:exam.dbExamId!,scope:requestStorage,started};
   setWatching(true);setAccepted(receipt);setShowProgress(true);
   try{temporaryDraftStore.write(requestStorage+':accepted',JSON.stringify(receipt));}catch{/* History restores the accepted run even if browser storage is full. */}
   setNotice('평가 상태를 확인하고 있어요.');
  }catch(error){const code=error instanceof Error?error.message:'';setNotice(code==='EXAM_SESSION_CONTRACT_PENDING'?'여러 문항을 함께 첨삭하는 기능을 준비하고 있어요. 답안은 보존되며 크레딧은 사용되지 않았습니다.':code==='INSUFFICIENT_CREDIT'?'크레딧이 부족합니다.':code==='ANSWER_REQUIRED'?'선택한 문항의 텍스트 답안을 확인해 주세요. 사진 포함 답안은 아직 이 시험에서 제출할 수 없습니다.':code==='PENDING_CHANGED'?'이전 제출의 처리 상태를 첨삭 기록에서 먼저 확인해 주세요.':'처리 상태를 확인하지 못했습니다. 답안은 유지됩니다. 같은 답안으로 다시 확인해 주세요.');}
  finally{setBusy(false);}
 }
 return <div className="essay-submit-gate essay-session-request"><h2>전체 회차 첨삭 요청</h2><div className="essay-request-summary"><p>문항 수와 관계없이 <strong>{parentId?0:1} Credit</strong> · {parentId?'무료 재첨삭':'새 첨삭 회차'}</p><ul>{exam.questions.map(q=><li key={q.key}><strong>{q.label}</strong><span>{!included.includes(q.key)?'이번 제출에서 제외':drafts[q.key]?.saved===false?'저장 확인 필요':drafts[q.key]?.images&&!drafts[q.key]?.mathInput?'사진 내용 확인 필요':'답안 준비 완료'}</span></li>)}</ul></div>{inputBlocked&&<p className="essay-input-required" role="note">사진에서 추출한 내용을 확인한 뒤 ‘이 내용으로 확인’을 눌러 주세요.</p>}{confirmCost!==null&&<div className="essay-confirm-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="exam-submit-title" className="my-panel essay-confirm-dialog"><h2 id="exam-submit-title">{unwritten.length?'작성하지 않은 답안이 있습니다':omitted.length?'이번 회차에서 제외한 답안이 있습니다':'시험 회차 첨삭 요청'}</h2>{unwritten.length>0&&<p>{unwritten.map(q=>q.label).join(', ')}의 답안을 작성하지 않았습니다.</p>}{omitted.length>0&&<p>{omitted.map(q=>q.label).join(', ')}의 답안은 이번 첨삭에 포함하지 않습니다. 저장된 답안은 보존됩니다.</p>}<p>{missing.length?'작성한 답안만 첨삭을 진행할까요?':'작성한 답안을 함께 첨삭할까요?'}</p><p>이번 첨삭에는 {confirmCost} 크레딧이 사용됩니다.</p>{missing.length>0&&<p>이번에 제출하지 않은 문항을 나중에 새로 첨삭받으면 별도의 첨삭 회차로 1 크레딧이 사용됩니다. 기존 회차의 무료 재첨삭에는 추가할 수 없습니다.</p>}<div className="my-actions"><button autoFocus className="button button--outline" onClick={()=>resolveConfirmation(false)}>계속 작성하기</button><button className="button button--primary" onClick={()=>resolveConfirmation(true)}>첨삭 진행하기</button></div></section></div>}{!cycle&&rewrites.length>0&&<label>제출 방식<select disabled={busy||acceptedHere} value={parentId} onChange={e=>{setParentId(e.target.value);setNotice('');}}><option value="">새 첨삭 · 1 크레딧</option>{rewrites.map(r=><option key={String(r.id)} value={String(r.id)}>무료 재첨삭 · {String(r.created_at).slice(0,10)}</option>)}</select></label>}{parentId&&<p>최초 제출과 동일한 문항을 선택하고 답안을 수정해 주세요. 재첨삭 가능 여부는 서버에서 확인합니다.</p>}<button className="button button--primary" disabled={inputBlocked||!ready||busy||acceptedHere||!included.length||included.some(key=>drafts[key]?.saved===false)} onClick={()=>void submit()}>{busy?'처리 중…':ready?(parentId?(rewrites.some(r=>r.id===parentId)?'무료 재첨삭 요청':'재첨삭 자격 확인'):cycle?.previousPaidRunId?'추가 첨삭 · 1 크레딧':'논술 첨삭 요청하기 · 1 크레딧'):'첨삭 가능 여부 확인 중'}</button>{admissionError&&<p role="status">일시적으로 첨삭 가능 여부를 확인할 수 없습니다. <button onClick={()=>setAdmissionRetry(v=>v+1)}>다시 시도</button></p>}<p role="status">{notice||'작성 중인 답안은 그대로 보존됩니다.'}</p>{(busy||watching&&acceptedHere)&&<p>{waitMessage}</p>}{acceptedHere&&<button className="button button--outline" onClick={()=>setShowProgress(true)}>접수한 첨삭 진행 상태 보기</button>}{acceptedHere&&<EssaySessionProgress runId={accepted!.id} onComplete={refreshResult} hidden={!showProgress} presentation={{onClose:()=>setShowProgress(false),onResult:refreshResult}}/>}<Link href="/my/essays/">나의 첨삭 기록 →</Link></div>;
}
