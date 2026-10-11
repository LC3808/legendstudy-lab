'use client';
import Link from 'next/link';
import './essay-service.css';
import {RecordDetail} from './my/essay-dashboard';
import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useAuth} from './auth-context';
import {EssayRuntimeClient,type Row} from '@/lib/essay-runtime/client';
import {essaySupabaseTransport} from '@/lib/essay-runtime/supabase-transport';
import {isUuid,loadQuestion,loadExams,officialUrl,type Exam,type Question} from '@/lib/essay-runtime/catalog';
/** Mounted canonical Draft/Submission consumer. Evaluation requires separately verified server admission. */
export function EssayServiceWorkspace(){
 const auth=useAuth(),params=useSearchParams(),question=params.get('question')??'',session=params.get('session')??undefined;
 if(!isUuid(question)||(session&&!isUuid(session)))return <p role="alert">문항 주소를 확인해 주세요.</p>;
 if(auth.status==='loading')return <p role="status">로그인을 확인하고 있습니다.</p>;
 if(!auth.user||!auth.client)return <p><Link href={`/login/?next=${encodeURIComponent(`/essay-lab/write/?question=${question}${session?`&session=${session}`:''}`)}`}>로그인</Link> 후 내 답안을 저장할 수 있습니다.</p>;
 return <Workspace key={`${auth.user.id}:${question}:${session??''}`} questionId={question} resume={session}/>;
}
function Workspace({questionId,resume}:{questionId:string;resume?:string}){
 const auth=useAuth(),owner=auth.user!.id,client=auth.client!;
 const identity=useRef<string|null>(owner);
 const runtime=useRef<EssayRuntimeClient|null>(null),alive=useRef(true),lock=useRef(false);
 const [exam,setExam]=useState<Exam|null>(null);
 const [question,setQuestion]=useState<Question|null>(null),[body,setBody]=useState(''),[revision,setRevision]=useState<number|null>(null);
 const [busy,setBusy]=useState(true),[notice,setNotice]=useState('문항과 저장된 답안을 불러오고 있습니다.');
 const [sessionId,setSessionId]=useState<string>();
 const [panel,setPanel]=useState<'question'|'answer'>('answer');
 const [retryable,setRetryable]=useState(false);
 const [admitted,setAdmitted]=useState(false),[evaluation,setEvaluation]=useState<string|null>(null),[result,setResult]=useState<Row|null>(null);
 const [savedBody,setSavedBody]=useState(''),[attempt,setAttempt]=useState<string|null>(null),[history,setHistory]=useState<Row[]>([]);
 useEffect(()=>{
  alive.current=true;identity.current=owner;const r=new EssayRuntimeClient(essaySupabaseTransport(client,()=>identity.current),questionId,true);runtime.current=r;
  void (async()=>{
   const q=await loadQuestion(client,questionId);if(!alive.current)return;
   const draft=await r.open(resume);if(!alive.current)return;
   const exams=await loadExams(client);if(!alive.current)return;setExam(exams.find(e=>e.id===q.essay_exam_id)??null);
   if(r.sessionId){const url=new URL(window.location.href);url.searchParams.set('session',r.sessionId);window.history.replaceState(null,'',url.toString());}
   setSessionId(r.sessionId??undefined);setQuestion(q);setBody(draft.body);setSavedBody(draft.body);setRevision(draft.revision);setNotice('저장된 답안을 불러왔습니다.');
   const h=await r.history();if(alive.current)setHistory(h.evaluations);
   const token=(await client.auth.getSession()).data.session?.access_token;
   if(token){try{const response=await fetch('/api/essay/admission',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({question_id:questionId}),signal:AbortSignal.timeout(15000)});const a=await response.json();if(alive.current)setAdmitted(response.ok&&a.version==='essay-question-admission-v1'&&a.enabled===true);}catch{/* Evaluation stays closed; draft remains usable. */}}

  })().catch(()=>{if(alive.current)setNotice('문항 또는 저장된 답안을 불러오지 못했습니다. 접근 권한과 연결을 확인해 주세요.');}).finally(()=>{if(alive.current)setBusy(false);});
  return()=>{alive.current=false;identity.current=null;r.revoke();};
 },[client,owner,questionId,resume]);
 useEffect(()=>{const before=(event:BeforeUnloadEvent)=>{if(body!==savedBody){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[body,savedBody]);
 async function run(submit=false){
  if(lock.current||revision===null||!runtime.current)return;lock.current=true;setBusy(true);
  try{
   let next=revision;
   if(body!==savedBody){const saved=await runtime.current.save(body,revision);next=saved.revision;if(!alive.current)return;setRevision(next);setSavedBody(body);}
   if(submit){const id=await runtime.current.submit(body,next);if(alive.current){setAttempt(id);setNotice('답안을 제출했습니다. 아직 첨삭을 요청하거나 Credit을 사용하지 않았습니다.');}}
   else if(alive.current)setNotice('계정에 저장했습니다. 다른 기기에서도 같은 답안을 이어 쓸 수 있습니다.');
  }catch(error){if(alive.current)setNotice(error&&typeof error==='object'&&'code' in error&&error.code==='PT409'?'다른 기기에서 답안이 변경되었습니다. 작성 내용을 복사한 뒤 저장된 답안을 다시 확인해 주세요.':'저장 또는 제출을 완료하지 못했습니다. 작성 내용은 화면에 유지됩니다. 다시 시도해 주세요.');}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 async function checkResult(id:string){
  const r=runtime.current!;const status=await r.status(id);
  if(!alive.current)return;
  setRetryable(status.state==='failed'&&status.no_credit_consumed);
  if(status.state==='completed'){const value=await r.result(id);if(alive.current){setResult(value);setNotice('첨삭을 완료했습니다. 결과를 확인하고 직접 고쳐 써보세요.');}}
  else if(status.state==='failed')setNotice(status.no_credit_consumed?'첨삭을 완료하지 못했습니다. Credit은 사용되지 않았습니다.':'첨삭을 완료하지 못했습니다. Credit 처리 상태를 확인하고 있습니다.');
  else setNotice('처리 상태를 확인하고 있습니다. 새로 요청하지 않아도 됩니다.');
  const h=await r.history();if(alive.current)setHistory(h.evaluations);
  window.dispatchEvent(new Event('legendstudy:credit-refresh'));
 }
 async function evaluate(retry=false){
  if(!attempt||!admitted||lock.current||(retry&&(!evaluation||!retryable)))return;lock.current=true;setBusy(true);
  try{
   const token=(await client.auth.getSession()).data.session?.access_token;if(!token)throw Error('LOGIN_REQUIRED');
   const response=await fetch('/api/essay/evaluate',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({attempt_id:attempt,...(retry?{retry_evaluation_id:evaluation}:{})}),signal:AbortSignal.timeout(55000)});
   const value=await response.json();if(!alive.current)return;
   if(!response.ok||!isUuid(value.evaluation_id))throw Error('UNAVAILABLE');setEvaluation(value.evaluation_id);setRetryable(false);await checkResult(value.evaluation_id);
  }catch{if(alive.current)setNotice('요청 상태를 확인하지 못했습니다. 같은 요청을 다시 확인하거나 첨삭 기록을 확인해 주세요.');}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="content-wrap page-section essay-service" aria-busy={busy} style={{maxWidth:'82rem',overflowWrap:'anywhere'}}>
  <Link href="/essay-lab/">← 기출문제 선택</Link><h1>{question?.label??'답안 작성'}</h1>
  <p role="status">{notice}</p>
  {question&&<>
   <div className="essay-writing-tabs" role="tablist" aria-label="문제와 답안"><button role="tab" aria-selected={panel==='question'} onClick={()=>setPanel('question')}>문제 보기</button><button role="tab" aria-selected={panel==='answer'} onClick={()=>setPanel('answer')}>답안 작성</button></div>
   <div className="essay-writing-grid" data-panel={panel}><aside className="essay-reading-pane" aria-label="공식 문항"><h2>{question.label}</h2>
   {exam&&officialUrl(exam.official_source_url)&&<p><a href={officialUrl(exam.official_source_url)!} target="_blank" rel="noopener noreferrer">출처 · {exam.universities.name} 입학처 원문 보기 ↗</a></p>}
   <p>공식 문항 원문과 작성 조건을 확인하고 답안을 작성하세요. 사진 답안은 이 문항에서 지원하지 않습니다.</p>
   <p>제시문·도표는 공식 원문에서 확인해 주세요. 확인되지 않은 자료는 표시하지 않습니다.</p></aside><div className="essay-answer-pane">
   <p>{Array.from(body).length.toLocaleString('ko-KR')}자 · 공백 포함 참고 수치{question.length_count_rule?` · 공식 분량 계산 기준: ${question.length_count_rule}`:' · 공식 분량 계산 기준 미확인'}</p>
   <label htmlFor="service-essay-answer">내 답안</label>
   <textarea id="service-essay-answer" rows={14} maxLength={30000} value={body} disabled={busy||!!attempt} onChange={e=>setBody(e.target.value)} style={{width:'100%',boxSizing:'border-box'}}/>
   <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginTop:'1rem'}}>
    <button className="button button--outline" disabled={busy||!!attempt} onClick={()=>void run()}>답안 저장</button>
    <button className="button button--primary" disabled={busy||!!attempt||!body.trim()} onClick={()=>void run(true)}>답안 제출</button>
    {attempt&&<button className="button button--primary" disabled={busy} onClick={()=>{setPanel('answer');setAttempt(null);setEvaluation(null);setResult(null);setRetryable(false);setNotice('이전 제출을 보존하고 같은 답안을 직접 고쳐 쓸 수 있습니다.');}}>다시 써보기</button>}
   </div>
   <p>저장·제출에는 Credit이 사용되지 않습니다. 최초 첨삭 성공 시 1 Credit을 사용하며, 14일 이내 같은 답안의 첫 재첨삭 1회가 포함됩니다. 적용 여부는 서버에서 확인합니다.</p>
   <button className="button button--primary" disabled={!admitted||!attempt||busy||!!evaluation} onClick={()=>void evaluate()}>{admitted?'첨삭 진행':'첨삭 준비 중'}</button>
   {!admitted&&<p>이 문항의 실제 첨삭 연결을 확인한 뒤 이용할 수 있습니다.</p>}
   {retryable&&<button className="button button--outline" disabled={busy||!admitted} onClick={()=>void evaluate(true)}>실패한 첨삭 다시 시도</button>}
   {evaluation&&<button className="button button--outline" disabled={busy} onClick={()=>void checkResult(evaluation).catch(()=>{if(alive.current)setNotice('처리 상태를 불러오지 못했습니다.');})}>결과 다시 확인</button>}
   </div></div>
   {result&&attempt&&sessionId&&<section aria-label="첨삭 결과"><RecordDetail row={{id:attempt,source:'essay',question:question.label,university:exam?.universities.name??null,year:exam?.admission_year,at:'',rewrite:history.some(e=>e.attempt_id!==attempt),evaluations:[],sessionId}}/></section>}

  </>}
  <h2>이 문항의 첨삭 기록</h2>{history.map(e=><p key={String(e.id)}><Link href={'/my/essays/'}>{e.status==='completed'?'완료된 첨삭 보기':'처리 상태 확인'}</Link></p>)}
  <Link href="/my/essays/">나의 첨삭 기록 전체 보기</Link>
 </section>;
}
