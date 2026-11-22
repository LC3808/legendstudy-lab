'use client';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {labState} from '@/lib/admin/lab-operations';
import {mayRecover,parseRecoveryDiagnosis,parseRecoveryResult,recoveryDate,recoveryMethod,recoveryReason,recoveryState,type RecoveryDiagnosis,type RecoveryResult} from '@/lib/admin/run-recovery';
import './admin-run-recovery.css';

type Props={runId:string;subjectId:string;university:string;exam:string;requestType:string;autoInspect?:boolean;onChanged:()=>void};
const readiness:Record<string,string>={completed:'저장 완료 · 보존',retryable:'확정 실패 · 재첨삭 가능',recoverable:'저장 자료 검증·복원 필요',unresolved:'응답 확인 필요',stored_result:'저장 결과 확인',unknown:'확인 필요'};
const billingStatus:Record<string,string>={reserved:'예약 유지',settled:'정산 완료',released:'예약 해제',returned:'예약 반환',refunded:'환불',cancelled:'취소'};
const worker:Record<string,string>={active:'실행 잠금 유효',response_uncertain:'응답 확인 필요',inactive:'유효한 실행 잠금 없음',unknown:'실행 상태 확인 불가'};
const terminalErrors=new Set(['DIAGNOSIS_CHANGED','ARTIFACT_VERIFICATION_FAILED','DISPATCH_NOT_CONFIRMED','LEDGER_RECONCILIATION_REQUIRED','FINAL_CHECKPOINT_CONFLICT','REPLAY_NOT_DISPATCHABLE','DIAGNOSIS_STALE','STALE_DIAGNOSIS','ACTIVE_LEASE','RUN_ARCHIVED','FINALIZED_RUN','RECONCILIATION_REQUIRED','RECOVERY_NOT_ALLOWED','BILLING_INCONSISTENT','LEDGER_INCONSISTENT','RESULT_INTEGRITY_FAILED','RUN_NOT_FOUND','ACTION_KEY_CONFLICT','ACTION_SUPERSEDED']);

export function AdminRunRecovery({runId,subjectId,university,exam,requestType,autoInspect=false,onChanged}:Props){
 const {client}=useAuth();
 const [diagnosis,setDiagnosis]=useState<RecoveryDiagnosis|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<RecoveryResult|null>(null),[uncertain,setUncertain]=useState(false);
 const lock=useRef(false),autoOpened=useRef(false),pending=useRef<{key:string;diagnosis_token:string}|null>(null);
 async function read(){
  if(!client)throw Error('LOGIN_REQUIRED');
  const response=await client.rpc('admin_lab_run_recovery',{p_run:runId});
  if(response.error){const code=response.error.code==='PGRST202'?'ADMIN_CONTRACT_PENDING':response.error.code==='PT404'?'RUN_NOT_FOUND':'DIAGNOSIS_UNAVAILABLE';throw Error(code);}
  const next=parseRecoveryDiagnosis(response.data,runId);if(next.subject_id!==subjectId)throw Error('DIAGNOSIS_UNAVAILABLE');return next;
 }
 async function inspect(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const next=await read();setDiagnosis(next);if(diagnosis&&next.diagnosis_token!==diagnosis.diagnosis_token){onChanged();window.dispatchEvent(new Event('admin-lab-changed'));}}catch(e){setError(recoveryReason(e instanceof Error?e.message:'DIAGNOSIS_UNAVAILABLE'));}finally{lock.current=false;setBusy(false);}
 }
 // Only explicit recovery deep links open a read-only diagnosis automatically.
 useEffect(()=>{if(autoInspect&&client&&!autoOpened.current){autoOpened.current=true;void inspect();}},[autoInspect,client]); // eslint-disable-line react-hooks/exhaustive-deps
 async function execute(){
  if(!client||lock.current||(!pending.current&&(!diagnosis||!mayRecover(diagnosis))))return;
  lock.current=true;setBusy(true);setError('');
  try{
   if(!pending.current){
    const fresh=await read();setDiagnosis(fresh);
    if(!mayRecover(fresh)){setError(recoveryReason(fresh.recovery.reason??'RECOVERY_NOT_ALLOWED'));return;}
    if(fresh.diagnosis_token!==diagnosis?.diagnosis_token){setError(recoveryReason('DIAGNOSIS_STALE'));return;}
    const targets=fresh.questions.filter(q=>fresh.recovery.target_question_ids.includes(q.question_id)).map(q=>`${q.index+1}번 문항 (${q.question_id})`).join('\n')||'새 첨삭 대상 없음';
    if(!window.confirm(`첨삭 복구·완료 확인\n${university} · ${exam}\n요청 ID: ${runId}\n학생 ID: ${subjectId}\n유형: ${requestType}\n상태: ${labState(fresh.state)}\n방법: ${recoveryMethod(fresh.recovery.method)}\n대상: ${targets}\n다시 첨삭할 문항 수: ${fresh.recovery.rerun_question_count}개 (AI 호출 횟수와 다를 수 있음)\n추가 이용권 차감: 0개\n기존 답안·완료 결과·이용권 원장을 보존합니다.\n서버가 잠금과 진단 상태를 다시 검증합니다. 계속할까요?`))return;
    pending.current={key:crypto.randomUUID(),diagnosis_token:fresh.diagnosis_token};
   }
   const command=pending.current;
   const session=await client.auth.getSession(),token=session.data.session?.access_token;if(!token)throw Error('LOGIN_REQUIRED');
   const response=await fetch('/api/admin/essay-run',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'recover',run_id:runId,...command})});
   const body=await response.json();
   if(!response.ok&&body?.version!=='admin-run-recovery-v1'){
    const code=typeof body?.code==='string'?body.code:'REQUEST_UNCERTAIN';
    if(terminalErrors.has(code)){pending.current=null;setUncertain(false);}else setUncertain(true);
    throw Error(code);
   }
   const outcome=parseRecoveryResult(body,runId,command.key);setResult(outcome);
   // An unfinished verification remains the same intent on retry, never a new action.
   if(outcome.state==='verification_required'){setUncertain(true);}else{pending.current=null;setUncertain(false);}
   onChanged();window.dispatchEvent(new Event('admin-lab-changed'));
   try{setDiagnosis(await read());}catch{setError('처리 응답은 확인했으나 최신 진단을 불러오지 못했습니다. 진단을 새로고침하세요.');}
  }catch(e){if(pending.current)setUncertain(true);setError(recoveryReason(e instanceof Error?e.message:'REQUEST_UNCERTAIN'));}
  finally{lock.current=false;setBusy(false);}
 }
 const d=diagnosis;
 return <section className="lab-recovery" aria-label="첨삭 복구·완료 진단">
  <h3>첨삭 복구·완료</h3><p>먼저 저장 결과와 실행·이용권 상태를 진단합니다. 응답 여부가 불확실한 문항은 임의로 다시 실행하거나 완료하지 않습니다.</p>
  <button disabled={busy} onClick={()=>void inspect()}>{busy?'복구 상태 확인 중…':d?'복구 진단 새로고침':'복구 진단 확인'}</button>
  {error&&<p role="alert">{error}</p>}
  {result&&<p className="lab-recovery__outcome" role="status">{result.state==='queued'&&d?.state==='completed'?'현재 요청 완료 · 최신 진단에서 완료 상태를 확인했습니다. 복구 작업과의 연결은 처리 이력에서 확인하세요.':<>{recoveryState(result.state)}{result.state==='queued'?' · 요청이 접수되었습니다. 복구 진단을 새로고침하여 실제 완료 여부를 확인하세요.':result.state==='completed'?' · 서버에서 실제 완료를 확인했습니다.':result.state==='blocked'?` · ${recoveryReason(result.reason)}`:' · 아직 완료되지 않았습니다. 같은 복구 요청의 결과를 다시 확인하세요.'}</>}</p>}
  {d&&<>
   <p>진단 기준 {recoveryDate(d.as_of)} (KST) · {d.hidden?'보관 · ':''}{labState(d.state)} · {requestType}</p>
   <dl className="lab-recovery__facts"><div><dt>요청 ID</dt><dd>{runId}</dd></div><div><dt>학생 ID</dt><dd>{d.subject_id}</dd></div><div><dt>대학·시험</dt><dd>{university} · {exam}</dd></div><div><dt>생성 시각</dt><dd>{recoveryDate(d.created_at)}</dd></div><div><dt>마지막 실행 / 상태 변경</dt><dd>{recoveryDate(d.last_execution_at)} / {recoveryDate(d.last_state_change_at)}</dd></div><div><dt>실행 상태</dt><dd>{worker[d.worker_state]??worker.unknown} · 잠금 만료 {recoveryDate(d.lease_until)}</dd></div><div><dt>재시도 기록</dt><dd>{d.retry_count}회 · 최근 접수 {recoveryDate(d.last_retry_at)}</dd></div><div><dt>확인된 오류</dt><dd>{d.recent_error?recoveryReason(d.recent_error.code):'기록 없음'} · 현재 시도의 기록이며 발생 시각 순서를 확정하지 않습니다.</dd></div></dl>
   <p>저장 완료 {d.counts.completed}/{d.counts.total}문항 · 미완료 {d.counts.total-d.counts.completed}문항 · 확정 실패 {d.counts.failed}문항 · 복원 검토 가능 {d.counts.recoverable}문항 · 응답 확인 필요 {d.counts.unresolved}문항</p>
   <p>최종 결과에 저장된 문항 {d.counts.stored_result}개. 잠금 만료만으로 Worker 중단이나 재실행 안전성을 확정하지 않습니다.</p>
   <div className="admin-table-scroll"><table className="admin-table"><caption>문항별 복구 진단</caption><thead><tr><th>문항</th><th>확인 상태</th><th>복구 대상</th></tr></thead><tbody>{d.questions.map(q=><tr key={q.question_id}><td>{q.index+1}번 문항</td><td>{readiness[q.readiness]??'검증 필요'}{q.reason&&<p>{recoveryReason(q.reason)}</p>}</td><td>{d.recovery.target_question_ids.includes(q.question_id)?'대상':'기존 상태 보존'}</td></tr>)}</tbody></table></div>
   <p>이용권 상태 {billingStatus[d.billing.status]??'확인 필요'} · 필요 {d.billing.credits_required}개 · 현재 예약 잔량 {d.billing.reserved}개 · 사용 {d.billing.consumed}개 · 예약 해제 {d.billing.released}개 · 환불 {d.billing.refunded}개 · 원장 {d.billing.ledger_count}건 · {d.billing.consistent?'원장 기본 조건 확인':'원장 기본 조건 확인 필요'}</p>
   <p>예약 이력 합계 {d.billing.reserved_total}개 · {d.billing.recovery_eligible?'기존 예약을 사용하는 복구 조건 충족':'복구용 예약 조건 미충족 · 완료·반환된 원장의 오류를 뜻하지 않음'}</p>
   {d.billing.credits_required===0&&<p>이용권 필요 수량이 0인 무료 회차입니다. 예약·원장 0건만으로 오류라고 판단하지 않습니다.</p>}
   <p>권장 처리: {recoveryMethod(d.recovery.method)} · 다시 첨삭할 문항 {d.recovery.rerun_question_count}개 · 추가 이용권 {d.recovery.additional_credit}개 · 기존 완료 결과 보존</p>
   {!mayRecover(d)&&<p>{recoveryReason(d.recovery.reason??'RECOVERY_NOT_ALLOWED')}</p>}
   <button disabled={busy||(!uncertain&&!mayRecover(d))} onClick={()=>void execute()}>{uncertain?'이전 복구 요청 결과 확인':'진단에 따라 복구 실행'}</button>
   <details><summary>복구 작업 이력 · {d.history.length}건</summary>{d.history.length?<ul>{d.history.map((h,i)=><li key={`${h.action_id}:${i}`}>{recoveryDate(h.recorded_at)} · {recoveryState(h.state)} · 관리자 {h.actor}{h.reason&&` · ${recoveryReason(h.reason)}`}</li>)}</ul>:<p>복구 작업 기록 없음</p>}</details>
  </>}
 </section>;
}
