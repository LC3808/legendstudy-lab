'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '../auth-context';
import {MathText} from '../math-display/math-text';
import {array,object,text} from '@/lib/my/evaluation-report';
export type CoachingRef={evaluationId?:string;runId?:string;questionId?:string};
/** Same math-coaching-v1 as Native. Never fall back to raw evaluation prose. */
export function ServerCoaching(props:CoachingRef){
 const auth=useAuth();
 return <OwnerCoaching key={`${auth.user?.id}/${props.evaluationId}/${props.runId}/${props.questionId}`} {...props}/>;
}
function OwnerCoaching(props:CoachingRef){
 const auth=useAuth(),[data,setData]=useState<Record<string,unknown>|null>(null),[error,setError]=useState(false),[busy,setBusy]=useState(false),[hints,setHints]=useState<Record<string,string>>({});
 const keys=useRef(new Map<string,string>()),active=useRef(true);
 const identity=`${auth.user?.id}/${props.evaluationId}/${props.runId}/${props.questionId}`;
 const request=useCallback(async(action:string,extra:Record<string,unknown>={})=>{
  const user=auth.user?.id,client=auth.client;if(!user||!client)throw Error('LOGIN_REQUIRED');
  const key=`${identity}/${action}/${extra.task_id}/${extra.level}`;
  if(!keys.current.has(key))keys.current.set(key,crypto.randomUUID());
  const payload={...(props.runId?{run_id:props.runId,question_id:props.questionId}:{evaluation_id:props.evaluationId}),...extra,...(action==='read'?{}:{client_submission_id:keys.current.get(key)})};
  const session=await client.auth.getSession();if(session.data.session?.user.id!==user)throw Error('ACCOUNT_CHANGED');
  const result=await client.rpc(props.runId?'essay_math_coaching':'math_coaching',{p_request:{dto_version:'math-coaching-v1',action,payload}}).abortSignal(AbortSignal.timeout(20000));
  if(result.error||!active.current)throw Error('READ_FAILED');
  const wire=object(result.data),value=object(wire.result);
  if(wire.dto_version!=='math-coaching-v1'||wire.action!==action)throw Error('CONTRACT_REQUIRED');
  if(action!=='hint'&&(value.version!=='math-coaching-v1'||typeof value.disclosed!=='boolean'||!Array.isArray(value.tasks)||value.tasks.length>5||(!value.disclosed&&'full_solution'in value)))throw Error('UNSAFE_RESPONSE');
  return value;
 },[auth.user?.id,auth.client,identity,props.runId,props.questionId,props.evaluationId]);
 useEffect(()=>{let current=true;active.current=true;request('read').then(value=>{if(current)setData(value);}).catch(()=>{if(current)setError(true);});return()=>{current=false;active.current=false;};},[request]);
 async function act(action:string,extra:Record<string,unknown>={}){if(busy)return;setBusy(true);setError(false);try{const value=await request(action,extra);if(action==='hint')setHints(old=>({...old,[`${extra.task_id}/${extra.level}`]:text(value.body)}));else setData(value);}catch{setError(true);}finally{setBusy(false);}}
 return <section className="my-panel" aria-label="수리논술 첨삭 결과" aria-busy={busy}>
 {error&&<p role="alert">안전한 첨삭 결과를 확인하지 못했습니다. 다시 확인해 주세요.</p>}
 {!data?<button disabled={busy} onClick={()=>void act('read')}>첨삭 결과 확인</button>:<>
 <h3>종합 진단</h3><p>{text(data.diagnosis)}</p>
 <h3>잘한 점</h3>{array(data.strengths).map(object).map((s,i)=><p key={i}><strong>{text(s.title)}</strong> {text(s.description)}</p>)}
 <h3>우선 개선 과제</h3>{array(data.tasks).map(object).map(t=><article key={text(t.id)}><h4>{text(t.title)}</h4><p>{text(t.description)}</p><MathText text={text(t.student_formula)}/><p>{text(t.direction)}</p>{[1,2].map(level=><div key={level}><button disabled={busy} onClick={()=>void act('hint',{task_id:t.id,level})}>{level===1?'개념 힌트':'해결 방향'}</button><p>{hints[`${t.id}/${level}`]}</p></div>)}</article>)}
 <h3>기본 개념 확인</h3>{array(data.concepts).map(object).map(c=><details key={text(c.id)}><summary>{text(c.name)}</summary><MathText text={text(c.formula)}/><p>{text(c.description)}</p><p>{text(c.condition)}</p><p>{text(c.caution)}</p></details>)}
 {!data.disclosed?<button disabled={busy} onClick={()=>{if(window.confirm('전체 풀이와 정답이 공개됩니다. 확인하시겠습니까?'))void act('reveal');}}>전체 풀이 및 해설 보기</button>:<section aria-label="공개된 전체 풀이">{array(object(data.full_solution).steps).map(object).map((s,i)=><p key={i}><MathText text={[text(s.representation),text(s.explanation)].join('\n')}/></p>)}{array(object(data.full_solution).references).map(object).map((r,i)=><p key={i}><MathText text={text(r.body)}/></p>)}<MathText text={text(object(data.full_solution).generated_solution)||text(object(object(data.full_solution).generated_solution).body)}/></section>}
 </>}
 </section>;
}
