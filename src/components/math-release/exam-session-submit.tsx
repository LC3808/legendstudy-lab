'use client';
import {useEssayDraftSession,scopedDraftKey} from '../essay-draft-session';
import {EssayProgressDialog} from '../essay-progress-dialog';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {allQuestionsCompleted,openEssayResult,essayResultHref} from '@/lib/my/essay-result-route';
import {useAuth} from '../auth-context';
import {MathInputClient} from '@/lib/math-input/runtime/input-client';
import type {ReadInputResult,EvidenceMetadata} from '@/lib/math-input/runtime/contract';
import {sourceImageDraft} from '@/lib/source-image-draft';
import {temporaryDraftStore} from '@/lib/temporary-draft-store';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
import type {SubmissionDraft} from '../essay-exam-submit';

type QuestionState={attempt_id:string;leaf_id:string;question_id:string;evaluation_id:string;state:string};
type Round={version:'math-session-v1';run_id:string;exam_id:string;parent_id:string|null;state:string;created_at:string;free_rewrite_available:boolean;questions:QuestionState[]};
type Pending={fingerprint:string;key:string;attemptKeys:Record<string,string>;attempts:Record<string,string>;runId?:string;submitted?:boolean;retryKey?:string};
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function round(value:unknown):Round{
 const v=value as Round;
 if(!v||v.version!=='math-session-v1'||!uuid(v.run_id)||!uuid(v.exam_id)||!Array.isArray(v.questions)||!v.questions.length||v.questions.some(q=>!uuid(q.attempt_id)||!uuid(q.question_id)||!uuid(q.evaluation_id)))throw Error('INVALID_SESSION');
 return v;
}
/** Existing saved text/photos and Math input/confirmation contracts; one financial submit. */
export function MathExamSessionSubmit({exam,drafts,included,leaves,onInputsReady,restoreExistingInputs=false}:{restoreExistingInputs?:boolean;exam:SourceExam;drafts:Record<string,SubmissionDraft>;included:string[];leaves:Record<string,string>;onInputsReady?:(refs:Record<string,{attemptId:string;confirmedRunId:string}>)=>void}){
 const autoOpen=useRef(false);
 const draftSession=useEssayDraftSession();
 const auth=useAuth(),owner=auth.user?.id;
 const alive=useRef(true),running=useRef(false);
 const [showProgress,setShowProgress]=useState(false);
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [parents,setParents]=useState<Round[]>([]),[parentId,setParentId]=useState('');
 const [inputs,setInputs]=useState<Record<string,ReadInputResult>>({}),[corrections,setCorrections]=useState<Record<string,string>>({});
 const [pending,setPending]=useState<Pending|null>(null),[accepted,setAccepted]=useState<Round|null>(null),[confirm,setConfirm]=useState(false);
 const selected=exam.questions.filter(q=>included.includes(q.key));
 const missing=exam.questions.filter(q=>!included.includes(q.key));
 const parent=parents.find(r=>r.run_id===parentId);
 const scope=scopedDraftKey(`legendstudy:essay-source-draft:v1:${owner}:math-session:${exam.dbExamId}:${parentId||'initial'}:${selected.map(q=>q.dbQuestionId).sort().join(',')}`,draftSession);
 const blocked=!selected.length||selected.some(q=>!q.dbQuestionId||!leaves[q.dbQuestionId]||drafts[q.key]?.saved===false||!drafts[q.key]?.body.trim()&&!drafts[q.key]?.images);
 const credential=useCallback(async()=>{const s=(await auth.client?.auth.getSession())?.data.session;if(!alive.current||!s||s.user.id!==owner)throw Error('ACCOUNT_CHANGED');return s.access_token;},[auth.client,owner]);
 const call=useCallback(async function call(name:string,args:Record<string,unknown>){await credential();const response=await auth.client!.rpc(name,args).abortSignal(AbortSignal.timeout(20000));if(response.error)throw response.error;await credential();return response.data;},[auth.client,credential]);
 function inputClient(){return new MathInputClient({rpc:(name,p_request)=>call(name,{p_request})});}
 async function gateway(action:string,payload:unknown,upload=false){const response=await fetch(`/api/math/${action}`,{method:'POST',headers:{Authorization:`Bearer ${await credential()}`,...(upload?{}:{'Content-Type':'application/json'})},body:upload?payload as FormData:JSON.stringify(payload),signal:AbortSignal.timeout(100000)});await credential();if(!response.ok)throw Error('STATUS_UNKNOWN');return response.json();}
 function persist(value:Pending){temporaryDraftStore.write(scope,JSON.stringify(value));setPending({...value});}
 async function work(fn:()=>Promise<void>){if(running.current)return;running.current=true;setBusy(true);setNotice('');try{await fn();}catch{if(alive.current)setNotice('처리 상태를 확인하지 못했어요. 저장한 답안과 요청은 유지됩니다. 같은 요청으로 다시 확인해 주세요.');}finally{running.current=false;if(alive.current)setBusy(false);}}
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{let active=true;void(async()=>{
  if(!auth.client||!owner)return;
  const s=(await auth.client.auth.getSession()).data.session;if(!s||s.user.id!==owner)return;
  if(onInputsReady){if(active)setReady(true);return;}
  const response=await auth.client.rpc('math_session_history',{}).abortSignal(AbortSignal.timeout(20000));
  if(response.error||response.data?.version!=='math-session-history-v1'||!Array.isArray(response.data.runs))return;
  const rows=response.data.runs.map(round) as Round[];
  if(active){setReady(true);setParents(rows.filter(r=>r.exam_id===exam.dbExamId&&r.free_rewrite_available));}
 })().catch(()=>{});return()=>{active=false;};},[auth.client,owner,exam.dbExamId,onInputsReady]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;setInputs({});setCorrections({});setAccepted(null);setPending(null);setConfirm(false);
  try{const value=temporaryDraftStore.read(scope);if(value){const p=JSON.parse(value) as Pending;if(!uuid(p.key)||typeof p.fingerprint!=='string'||!p.attemptKeys||!p.attempts)throw Error('INVALID_PENDING');setPending(p);}}
  catch{setNotice('저장된 요청을 확인할 수 없습니다. 나의 첨삭 기록에서 먼저 처리 상태를 확인해 주세요.');}
 });return()=>{active=false;};},[scope]);
 async function snapshot(){
  const rows=[];
  for(const q of selected){
   const saved=drafts[q.key];const value=saved.images?await sourceImageDraft(scopedDraftKey(`legendstudy:essay-source-draft:v1:${owner}:${q.key}`,draftSession)):null;
   const files=Array.isArray(value)?value:value?[value]:[];if(saved.images&&!files.length)throw Error('IMAGE_MISSING');
   const hashes=[];for(const f of files){const digest=await crypto.subtle.digest('SHA-256',await f.arrayBuffer());hashes.push(Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''));}
   rows.push({q,body:saved.body,files,hashes});
  }
  const fingerprint=JSON.stringify({owner,examId:exam.dbExamId,parentId,answers:rows.map(r=>({questionId:r.q.dbQuestionId,body:r.body,images:r.hashes}))});
  return {rows,fingerprint};
 }
 async function prepare(fresh=false){
  if(blocked||!ready)return;
  if(fresh&&pending?.submitted)return;
  if(fresh){if(pending)temporaryDraftStore.write(scope+':previous-input:'+pending.key,JSON.stringify(pending));setInputs({});setCorrections({});onInputsReady?.({});}
  const snap=await snapshot();let p=!fresh&&pending?{...pending,attemptKeys:{...pending.attemptKeys},attempts:{...pending.attempts}}:null;
  if(p&&p.fingerprint!==snap.fingerprint){setNotice('이전 요청과 답안이 다릅니다. 먼저 기존 회차의 처리 상태를 확인해 주세요.');return;}
  p??={fingerprint:snap.fingerprint,key:crypto.randomUUID(),attemptKeys:{},attempts:{}};persist(p);
  if(p.runId){setAccepted(round(await call('math_session_read',{p_run:p.runId})));return;}
  for(const {q,body,files,hashes} of snap.rows){
   await credential();const previous=parent?.questions.find(row=>row.question_id===q.dbQuestionId);
   if(parentId&&!previous)throw Error('FROZEN_QUESTION_SET');
   p.attemptKeys[q.key]??=crypto.randomUUID();persist(p);
   let id=p.attempts[q.key];
   if(!id){const result=await inputClient().createAttempt({client_submission_id:p.attemptKeys[q.key],leaf_id:leaves[q.dbQuestionId!],kind:previous?'FULL_RESOLVE':'INITIAL',input_kind:files.length?(body.trim()?'MIXED':'EVIDENCE'):'TYPED',...(body.trim()?{typed_answer:body}:{}),...(previous?{predecessor_id:previous.attempt_id,prior_evaluation_id:previous.evaluation_id}:{})});id=result.attempt_id;p.attempts[q.key]=id;persist(p);}
   let state=await inputClient().readInput(id);
   if(files.length&&state.input_state==='INPUT_REQUIRED'&&(!state.candidate||state.candidate.state==='FAILED')){
    for(let i=0;i<files.length;i++){const file=files[i];const artifact=await inputClient().registerEvidence(id,{position:i+1,media_type:file.type as EvidenceMetadata['media_type'],byte_size:file.size,content_sha256:hashes[i]});const form=new FormData();form.set('artifact_id',artifact.artifact_id);form.set('file',file);await gateway('upload',form,true);}
    await gateway('extract',{attempt_id:id});state=await inputClient().readInput(id);
   }
   if(alive.current)setInputs(old=>({...old,[q.key]:state}));
  }
  setNotice('문항별 입력을 확인한 뒤 한 번에 첨삭을 요청해 주세요. 입력 확인에는 크레딧이 사용되지 않습니다.');
 }
 // Restore this exam's existing photo result without creating attempts, extracting,
 // confirming student content, or submitting a paid evaluation.
 useEffect(()=>{let active=true;
  if(!restoreExistingInputs||!ready||!pending||pending.submitted||running.current)return;
  void(async()=>{
   if((await snapshot()).fingerprint!==pending.fingerprint)return;
   const restored:Record<string,ReadInputResult>={};
   for(const q of selected){const id=pending.attempts[q.key];if(!uuid(id))return;
    const input=await inputClient().readInput(id);
    if(input.attempt.leaf_id!==leaves[q.dbQuestionId!])throw Error('INPUT_SCOPE_CHANGED');
    restored[q.key]=input;
   }
   if(active){setInputs(restored);setNotice('저장된 사진 입력을 불러왔습니다. 내용을 확인하면 전체 회차 첨삭을 요청할 수 있습니다.');}
  })().catch(()=>{if(active)setNotice('기존 사진 입력을 불러오지 못했습니다. 저장한 답안 입력 확인으로 다시 조회해 주세요.');});
  return()=>{active=false;};
 },[restoreExistingInputs,ready,scope,pending?.key]);
 async function dispatch(r:Round){
  for(const q of r.questions){if(q.state!=='REQUESTED')continue;try{await gateway('evaluate',{evaluation_id:q.evaluation_id});}catch{/* Preserve confirmed successes; status is read before offering retry. */}}
  const next=round(await call('math_session_read',{p_run:r.run_id}));setAccepted(next);if(next.free_rewrite_available)setParents(old=>[next,...old.filter(item=>item.run_id!==next.run_id)]);
  window.dispatchEvent(new Event('legendstudy:credit-refresh'));
  window.dispatchEvent(new CustomEvent('essay-history-changed',{detail:{owner}}));
 }
 async function submit(){autoOpen.current=true;setConfirm(false);if(!pending||!pending.submitted&&blocked)return;
  if(!pending.submitted&&(await snapshot()).fingerprint!==pending.fingerprint)throw Error('ANSWER_CHANGED');
  if(pending.runId){await dispatch(round(await call('math_session_read',{p_run:pending.runId})));return;}
  persist({...pending,submitted:true});
  const id=await call('math_session_submit',{p_exam:exam.dbExamId,p_key:pending.key,p_attempts:selected.map(q=>pending.attempts[q.key]),p_parent:parentId||null});if(!uuid(id))throw Error('INVALID_SESSION');
  const p={...pending,submitted:true,runId:id};persist(p);const registered=round(await call('math_session_read',{p_run:id}));setAccepted(registered);setShowProgress(true);await dispatch(registered);
 }
 const allReady=!!pending&&selected.length>0&&selected.every(q=>inputs[q.key]?.can_request_evaluation);
 useEffect(()=>{
  if(!onInputsReady||!allReady||!pending)return;
  const refs:Record<string,{attemptId:string;confirmedRunId:string}>={};
  for(const q of selected){const run=inputs[q.key]?.selected_extraction_id;if(!uuid(run))return;refs[q.key]={attemptId:pending.attempts[q.key],confirmedRunId:run};}
  onInputsReady(refs);
 },[onInputsReady,allReady,pending,inputs]);
 useEffect(()=>{if(onInputsReady||!pending?.runId)return;let active=true;
  void call('math_session_read',{p_run:pending.runId}).then(value=>{if(active)setAccepted(round(value));}).catch(()=>{if(active)setNotice('기존 요청 상태를 확인하지 못했습니다. 나의 첨삭 기록을 확인해 주세요.');});return()=>{active=false;};
 },[pending?.runId,onInputsReady,call]);
 const acceptedRunId=accepted?.run_id,acceptedState=accepted?.state;
 useEffect(()=>{if(onInputsReady||!acceptedRunId||['completed','failed'].includes(acceptedState??''))return;let active=true;
  const timer=setInterval(()=>{void call('math_session_read',{p_run:acceptedRunId}).then(value=>{if(active)setAccepted(round(value));}).catch(()=>{});},10000);
  return()=>{active=false;clearInterval(timer);};
 },[acceptedRunId,acceptedState,onInputsReady,call]);
 useEffect(()=>{if(autoOpen.current&&!onInputsReady&&accepted&&allQuestionsCompleted(accepted.state,accepted.questions))openEssayResult('math',accepted.run_id);},[accepted,onInputsReady]);
 const retryable=accepted?.state==='reserved'&&accepted.questions.some(q=>q.state==='FAILED')&&accepted.questions.every(q=>['FAILED','COMPLETED'].includes(q.state));
 return <section className="essay-submit-gate" aria-label={restoreExistingInputs?"사진 답안 확인":"수리논술 회차 첨삭"} aria-busy={busy}>
  {!draftSession&&!onInputsReady&&parents.length>0&&!pending&&<label>제출 방식<select value={parentId} disabled={busy} onChange={e=>setParentId(e.target.value)}><option value="">새 첨삭 · 1 크레딧</option>{parents.map(r=><option key={r.run_id} value={r.run_id}>무료 재첨삭 · {r.created_at.slice(0,10)}</option>)}</select></label>}
  {!accepted&&<button className="button button--outline" disabled={!ready||busy||blocked} onClick={()=>void work(()=>prepare())}>저장한 답안 입력 확인 · 0 크레딧</button>}
  {selected.map(q=>{const input=inputs[q.key];if(!input)return null;return <article className="essay-extraction-card" key={q.key}><h3>{q.label} · 사진에서 추출한 내용 확인</h3>{input.can_request_evaluation?<p>첨삭 요청 준비 완료</p>:<>
   <p>사진에서 읽은 답안을 확인해 주세요.</p>{input.candidate_regions.map(region=><label key={region.region_id}>확인할 내용<textarea value={corrections[region.region_id]??region.normalized_math??region.raw_text} onChange={e=>setCorrections(old=>({...old,[region.region_id]:e.target.value}))}/></label>)}
   {input.input_state==='CONFIRMATION_REQUIRED'&&<button className="button button--primary" disabled={busy} onClick={()=>void work(async()=>{await inputClient().confirmExtraction(pending!.attempts[q.key],String(input.candidate?.run_id??input.candidate?.id),input.candidate_regions.map(region=>({region_id:region.region_id,raw_text:corrections[region.region_id]??region.normalized_math??region.raw_text,normalized_math:corrections[region.region_id]??region.normalized_math??region.raw_text})));const next=await inputClient().readInput(pending!.attempts[q.key]);setInputs(old=>({...old,[q.key]:next}));})}>이 내용으로 확인</button>}
  </>}</article>;})}
  {!onInputsReady&&allReady&&!pending?.submitted&&!accepted&&<button className="button button--primary" disabled={busy||blocked} onClick={()=>setConfirm(true)}>회차 첨삭 요청 · {parentId?0:1} 크레딧</button>}
  {!onInputsReady&&pending?.submitted&&!accepted&&<button className="button button--primary" disabled={busy} onClick={()=>void work(submit)}>같은 회차 처리 확인</button>}
  {pending&&!pending.submitted&&!accepted&&<button className="button button--outline" disabled={busy||blocked} onClick={()=>void work(()=>prepare(true))}>다시 추출하기</button>}
  {pending&&!pending.submitted&&!accepted&&<button className="button button--outline" disabled={busy} onClick={()=>{temporaryDraftStore.remove(scope);setPending(null);setInputs({});setCorrections({});onInputsReady?.({});}}>입력 다시 준비</button>}
  {!onInputsReady&&confirm&&<div className="essay-confirm-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="math-session-confirm-title" className="my-panel essay-confirm-dialog"><h2 id="math-session-confirm-title">{missing.length?'작성하지 않았거나 제외한 답안이 있습니다':'시험 회차 첨삭 요청'}</h2>{missing.length>0&&<p>{missing.map(q=>q.label).join(', ')}은 이번 첨삭에 포함하지 않습니다.</p>}<p>이번 첨삭에는 {parentId?0:1} 크레딧이 사용됩니다.</p>{missing.length>0&&<p>미제출 문항을 나중에 새로 첨삭받으면 별도 회차로 1 크레딧이 사용됩니다.</p>}<button className="button button--outline" onClick={()=>setConfirm(false)}>계속 작성하기</button><button className="button button--primary" onClick={()=>void work(submit)}>첨삭 진행하기</button></section></div>}
  {accepted&&!onInputsReady&&<button className="button button--outline" onClick={()=>setShowProgress(true)}>접수한 첨삭 진행 상태 보기</button>}
  {accepted&&showProgress&&!onInputsReady&&<EssayProgressDialog state={accepted.state} questions={accepted.questions.map(q=>({id:q.question_id,label:exam.questions.find(item=>item.dbQuestionId===q.question_id)?.label??'문항',state:q.state}))} onClose={()=>setShowProgress(false)}>{accepted.state==='completed'&&<Link className="button button--primary" href={essayResultHref('math',accepted.run_id)}>첨삭 결과 확인하기</Link>}{retryable&&<button className="button button--primary" onClick={()=>setShowProgress(false)}>실패 문항 재처리로 이동 · 0 크레딧</button>}</EssayProgressDialog>}
  {accepted&&<><p>{accepted.state==='completed'?'회차 첨삭이 완료됐습니다.':'제출한 회차의 처리 상태를 확인하고 있습니다.'}</p>{accepted.questions.map(q=><p key={q.question_id}>{exam.questions.find(item=>item.dbQuestionId===q.question_id)?.label} · {q.state==='COMPLETED'?'완료':q.state==='FAILED'?'재처리 필요':'진행 중'}</p>)}<button className="button button--outline" disabled={busy} onClick={()=>void work(()=>dispatch(accepted))}>같은 회차 상태 확인</button>
   {retryable&&<button className="button button--outline" disabled={busy} onClick={()=>void work(async()=>{const p:Pending={...pending!,retryKey:pending?.retryKey??crypto.randomUUID()};persist(p);await call('math_session_retry',{p_run:accepted.run_id,p_key:p.retryKey});delete p.retryKey;persist(p);const next=round(await call('math_session_read',{p_run:accepted.run_id}));await dispatch(next);})}>실패 문항만 재처리 · 0 크레딧</button>}
   {accepted.state==='completed'&&<button className="button button--outline" disabled={busy} onClick={()=>{temporaryDraftStore.remove(scope);setPending(null);setAccepted(null);setInputs({});setCorrections({});}}>새 회차 작성</button>}
  </>}
  {!ready&&<p>회차 첨삭 연결을 확인하고 있습니다. 저장한 답안은 유지됩니다.</p>}
  {blocked&&selected.length>0&&<p>선택한 문항의 저장 상태와 첨삭 가능 여부를 확인해 주세요.</p>}
  <p role="status">{notice}</p><Link href="/my/essays/">나의 첨삭 기록 →</Link>
 </section>;
}
