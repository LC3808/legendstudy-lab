'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '../auth-context';
import {array,object,text} from '@/lib/my/evaluation-report';
import {mathRead} from '@/lib/my/essay-dashboard';
import {ExamRewrite} from '../my/exam-rewrite';
import {LearningCompletenessCard} from './learning-completeness';
import {StudyMath} from './study-math';
import {StudyEvidence,type Row} from './study-evidence';
import './math-study.css';
export type CoachingRef={evaluationId?:string;runId?:string;questionId?:string};
/** APP and WEB use the same owner-scoped DTO. No raw evaluation fallback. */
export function ServerCoaching(props:CoachingRef){
 const auth=useAuth();
 return <OwnerCoaching key={`${auth.user?.id}/${props.evaluationId}/${props.runId}/${props.questionId}`} {...props}/>;
}
function OwnerCoaching(props:CoachingRef){
 const auth=useAuth(),[data,setData]=useState<Row|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [input,setInput]=useState<Row|null>(null),[history,setHistory]=useState<Row|null>(null),[learning,setLearning]=useState<Row|null>(null);
 const [hints,setHints]=useState<Record<string,string>>({}),[selected,setSelected]=useState(''),[writing,setWriting]=useState(false);
 const keys=useRef(new Map<string,string>()),active=useRef(true);
 const owner=auth.user?.id;
 const identity=`${auth.user?.id}/${props.evaluationId}/${props.runId}/${props.questionId}`;
 const credential=useCallback(async()=>{
  const owner=auth.user?.id,client=auth.client;if(!owner||!client)throw Error('LOGIN_REQUIRED');
  const session=await client.auth.getSession();if(session.data.session?.user.id!==owner||!active.current)throw Error('ACCOUNT_CHANGED');return session.data.session;
 },[auth.user?.id,auth.client]);
 const request=useCallback(async(action:string,extra:Row={})=>{
  await credential();const key=`${identity}/${action}/${extra.task_id}/${extra.level}`;
  if(!keys.current.has(key))keys.current.set(key,crypto.randomUUID());
  const payload={...(props.runId?{run_id:props.runId,question_id:props.questionId}:{evaluation_id:props.evaluationId}),...extra,...(['read','history'].includes(action)?{}:{client_submission_id:keys.current.get(key)})};
  const result=await auth.client!.rpc(props.runId?'essay_math_coaching':'math_coaching',{p_request:{dto_version:'math-coaching-v1',action,payload}}).abortSignal(AbortSignal.timeout(20000));
  await credential();if(result.error)throw Error('READ_FAILED');
  const wire=object(result.data),value=object(wire.result);
  if(wire.dto_version!=='math-coaching-v1'||wire.action!==action)throw Error('CONTRACT_REQUIRED');
  if(['read','reveal'].includes(action)&&(value.version!=='math-coaching-v1'||typeof value.disclosed!=='boolean'||!Array.isArray(value.tasks)||value.tasks.length>5||(!value.disclosed&&'full_solution'in value)))throw Error('UNSAFE_RESPONSE');
  if(action==='history'&&!Array.isArray(value.attempts))throw Error('INVALID_HISTORY');
  if(action==='hint'&&typeof value.body!=='string')throw Error('INVALID_HINT');
  return value;
 },[auth.client,credential,identity,props.runId,props.questionId,props.evaluationId]);
 const loadImage=useCallback(async(id:string,signal:AbortSignal)=>{
  const s=await credential();const response=await fetch('/api/math/artifact',{method:'POST',headers:{Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({artifact_id:id}),cache:'no-store',signal});
  if(!response.ok||!/^image\/(png|jpeg|webp)(;|$)/.test(response.headers.get('content-type')??''))throw Error('IMAGE_UNAVAILABLE');
  const blob=await response.blob();await credential();if(blob.size>20971520)throw Error('IMAGE_TOO_LARGE');return blob;
 },[credential]);
 useEffect(()=>{let current=true;active.current=true;
  request('read').then(async value=>{
   if(!current)return;setData(value);
   const loads:PromiseLike<unknown>[]=[request('history').then(h=>{if(current)setHistory(h);})];
   if(text(value.attempt_id)&&auth.client&&owner)loads.push(mathRead(auth.client,owner,'read_input',{attempt_id:value.attempt_id}).then(i=>{if(current)setInput(i);}));
   if(!props.runId&&props.evaluationId&&auth.client)loads.push(auth.client.rpc('math_learning',{p_request:{dto_version:'math-learning-v1',action:'read_learning_state',payload:{evaluation_id:props.evaluationId}}}).then(async r=>{await credential();if(r.error)throw Error();if(current)setLearning(object(object(r.data).result));}));
   const results=await Promise.allSettled(loads);if(current&&results.some(r=>r.status==='rejected'))setError('원본 또는 학습 기록 일부를 불러오지 못했어요. 새로고침 후 확인해 주세요.');
  }).catch(()=>{if(current)setError('안전한 첨삭 결과를 확인하지 못했습니다. 다시 확인해 주세요.');});
  return()=>{current=false;active.current=false;};
 },[request,auth.client,owner,props.runId,props.evaluationId,credential]);
 const act=useCallback(async(action:string,extra:Row={})=>{
  if(busy)return;setBusy(true);setError('');
  try{const value=await request(action,extra);if(action==='hint')setHints(old=>({...old,[`${extra.task_id}/${extra.level}`]:text(value.body)}));else setData(value);
   if(['hint','reveal'].includes(action))setHistory(await request('history'));
  }catch{setError('요청을 완료하지 못했어요. 기존 결과를 보존했으며 다시 시도할 수 있습니다.');}
  finally{setBusy(false);}
 },[busy,request]);
 const tasks=array(data?.tasks).map(object),task=tasks.find(t=>t.id===selected)??tasks[0]??{};
 const policy=object(data?.rewrite_policy),sessionId=text(policy.session_run_id),canRewrite=policy.eligible===true||policy.paid_available===true;
 const rows=array(history?.attempts).map(object),current=rows.find(r=>r.evaluation_id===props.evaluationId||(r.run_id===props.runId&&r.question_id===props.questionId));
 const core=array(learning?.core).map(object).find(c=>c.error_id===task.id);
 const exposed=(level:number)=>!!hints[`${task.id}/${level}`]||array(learning?.hints).map(object).some(h=>h.core_id===core?.core_id&&h.level===level&&h.revealed===true);
 const full=object(data?.full_solution);
 if(writing&&sessionId)return <div className="math-study"><button onClick={()=>setWriting(false)}>첨삭 결과로 돌아가기</button><ExamRewrite runId={sessionId} additional={policy.eligible!==true} mathSession/></div>;
 return <section className="math-study" aria-label="수리논술 첨삭 결과" aria-busy={busy}>
 <header className="math-study-header"><div><span className="math-study-eyebrow">수리논술 LAB · 학습 워크스페이스</span><h2>{text(data?.exam_label)||'수리논술 첨삭 결과'}</h2><span className="math-study-note">원본을 확인하고, 힌트를 따라 직접 풀이를 고쳐 보세요.</span></div><Link className="math-study-button" href="/my/essays/">나의 첨삭 기록 ↗</Link></header>
 {error&&<p role="alert" className="math-study-error">{error}</p>}
 {!data?<button disabled={busy} onClick={()=>void act('read')}>첨삭 결과 확인</button>:<>
 <div className="math-study-grid">
 {input?<StudyEvidence key={`${identity}/${task.id??'all'}`} input={input} task={task} loadImage={loadImage}/>:<section className="math-study-panel"><h2>학생 원본 답안</h2><p>{props.runId?'혼합형 원본은 기존 제출 답안에서 확인해 주세요.':'원본과 확정 전사본을 확인하고 있어요.'}</p></section>}
 <section className="math-study-panel math-study-results" aria-label="첨삭 결과와 개선 과제"><h2>첨삭 결과</h2><div className="math-study-diagnosis"><h3>종합 진단</h3><p><StudyMath value={data.diagnosis}/></p></div>
 <LearningCompletenessCard value={data.learning_completeness} evaluationId={text(data.evaluation_id)}/>
 <h3>잘한 점</h3>{array(data.strengths).length?array(data.strengths).map(object).map((s,i)=><article key={i}><strong>✓ {text(s.title)}</strong><p><StudyMath value={s.description}/></p></article>):<p>별도로 확인된 강점이 없습니다. 판정 보류 여부를 함께 확인해 주세요.</p>}
 <h3>우선 개선 과제 <span className="math-study-badge">{tasks.length}개</span></h3><p className="math-study-note">평가 서버가 선정한 순서입니다. 공식 기준별 세부 설명은 제공된 범위에서 확인하세요.</p>
 {tasks.map((t,i)=><button className="math-study-task" key={text(t.id)} aria-pressed={task.id===t.id} onClick={()=>setSelected(text(t.id))}><strong>{i+1}. {text(t.title)}</strong><small>{text(t.importance)} · 풀이 단계 {String(t.position??'미확정')}</small></button>)}
 {!tasks.length&&<p>저장된 평가의 우선 개선 과제가 없습니다. 평가 보류를 정답 판정으로 해석하지 마세요.</p>}
 {text(task.id)&&<div><h3>{text(task.title)}</h3><div className="math-study-transcript"><StudyMath value={task.student_formula}/></div><p><StudyMath value={task.description}/></p><p><StudyMath value={task.direction}/></p><p className="math-study-note">{text(task.source_note)}</p><span className="math-study-badge">힌트 {exposed(2)?'2단계':exposed(1)?'1단계':'미공개'}</span></div>}
 {!!Number(data.remaining_task_count)&&<p>그 외 점검 과제 {Number(data.remaining_task_count)}개가 기록되어 있습니다.</p>}
 <button className="math-study-primary" disabled={busy||!canRewrite||!sessionId} onClick={()=>setWriting(true)}>수정 답안 작성 · {policy.eligible===true?'무료 재첨삭':policy.paid_available===true?'이용권 확인':'이용 조건 확인 필요'}</button>
 <p className="math-study-note">시험 단위 이용 조건은 서버에서 확인합니다. 각 사이클의 무료 재첨삭은 1회이며 기간과 베타 정책을 따릅니다.</p>
 </section>
 <aside className="math-study-panel math-study-learning" aria-label="기본 개념 힌트 해설"><h2>기본 개념 확인</h2>
 {array(data.concepts).length?array(data.concepts).map(object).map(c=><details key={text(c.id)} open><summary>{text(c.name)}</summary><div className="math-study-concept"><StudyMath value={c.formula} formula/><p><StudyMath value={c.description}/></p><p><strong>적용 조건</strong> <StudyMath value={c.condition}/></p><p><strong>주의할 점</strong> <StudyMath value={c.caution}/></p><p><strong>문제와의 관계</strong> <StudyMath value={c.relation}/></p></div></details>):<p>연결된 기본 개념이 없습니다.</p>}
 <HintSteps taskId={text(task.id)} busy={busy} revealed={[exposed(1),exposed(2)]} bodies={[hints[`${task.id}/1`],hints[`${task.id}/2`]]} onHint={level=>void act('hint',{task_id:task.id,level})}/>
 {!data.disclosed?<button className="math-study-primary" disabled={busy} onClick={()=>{if(window.confirm('전체 풀이와 정답이 공개됩니다. 먼저 직접 수정해 보셨나요? 공개하시겠습니까?'))void act('reveal');}}>전체 풀이 및 해설 보기</button>:<section aria-label="공개된 전체 풀이"><h3>전체 풀이 및 해설</h3><span className="math-study-badge">명시적 요청으로 공개됨</span>
 {array(full.references).map(object).map((r,i)=><details key={i}><summary>{r.origin==='OFFICIAL'?'공식 예시답안':r.origin==='VERIFIED_INTERNAL'?'검수 참고 풀이':'참고 풀이 · '+text(r.origin)}</summary>{r.relationship==='SUPPLEMENTAL_AFTER_ASSESSMENT'&&<p className="math-study-note">추가 연결 공식 자료 · 평가 당시 참고자료와 구분</p>}{text(r.source_locator)&&<p>{text(r.source_locator)}</p>}<StudyMath value={r.body}/></details>)}
 {!array(full.references).length&&<p className="math-study-note">연결된 공식 예시답안이 없습니다. 아래 분석을 공식 해설로 간주하지 마세요.</p>}
 {array(full.steps).length>0&&<details><summary>AI 평가의 풀이 단계</summary>{array(full.steps).map(object).map((s,i)=><article key={i}><h3>단계 {i+1}</h3><StudyMath value={s.representation}/><StudyMath value={s.explanation}/></article>)}</details>}
 {(text(full.generated_solution)||text(object(full.generated_solution).body))&&<details><summary>AI 생성 참고 해설</summary><StudyMath value={text(full.generated_solution)||object(full.generated_solution).body}/></details>}
 </section>}
 </aside></div>
 <details className="math-study-panel math-study-history"><summary>학습 기록 · History</summary><button disabled={busy} onClick={()=>void request('history').then(setHistory).catch(()=>setError('학습 기록을 읽지 못했어요.'))}>기록 새로고침</button>
 {!history?<p>학습 기록 읽는 중…</p>:rows.map((r,i)=><article key={text(r.attempt_id)||text(r.run_id)||i}><strong>{r.evaluation_id===props.evaluationId?'현재 답안 · ':''}{!r.prior_attempt_id&&!r.parent_id?'최초 답안':'수정 답안'}</strong><p><time>{text(r.created_at)}</time> · {text(r.evaluation_state)||text(r.state)||'상태 확인 중'}</p><p>힌트 공개 단계: {array(r.exposed_hint_levels).join(', ')||'없음'} · 전체 해설 {r.solution_revealed===true?'공개':'비공개'}</p></article>)}
 {current&&<p className="math-study-note">공개 기록과 재첨삭 이력은 APP과 동일한 계정으로 연결됩니다.</p>}
 </details></>}
 </section>;
}

function HintSteps({taskId,busy,revealed,bodies,onHint}:{taskId:string;busy:boolean;revealed:boolean[];bodies:(string|undefined)[];onHint:(level:number)=>void}){return <><h3>단계별 힌트</h3>{taskId?[1,2].map((level,i)=><div className="math-study-hint" key={`${taskId}/${level}`}><button disabled={busy||(level===2&&!revealed[0])} onClick={()=>onHint(level)}>{level===1?'개념 힌트':'해결 방향'}{revealed[i]?' · 공개됨 · 다시 보기':''}</button>{bodies[i]&&<p><StudyMath value={bodies[i]}/></p>}{revealed[i]&&!bodies[i]&&<p className="math-study-note">이전에 공개한 단계입니다. 다시 보기로 내용을 확인하세요.</p>}</div>):<p>개선 과제가 있는 경우 힌트를 확인할 수 있습니다.</p>}</>;}
