"use client";
import {useRef,useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {formatDateTime} from '@/lib/admin/format';
import {labState,type LabRun} from '@/lib/admin/lab-operations';
export type RunCapabilities={version:string;run_id:string;state:string;classification:string;ledger_count:number;credits_required:number;billing_status:string;decision_id:string;retry_allowed:boolean;retry_reason:string|null;delete_allowed:boolean;delete_reason:string|null;active_lease:boolean;hidden:boolean;lease_until:string|null;retry_lease_until:string|null;retry_created_at:string|null;as_of:string};
const reasons:Record<string,string>={UNREVIEWED_DEPENDENCY:'새 연결 데이터가 있어 삭제 전 추가 검토가 필요합니다.',LOGIN_REQUIRED:'로그인이 만료되었습니다. 다시 로그인하세요.',ACTIVE_LEASE:'실행 잠금이 유효한 정상 처리 중 요청입니다.',FINALIZED_RUN:'이미 종료된 요청입니다. 완료 중복 실행 또는 이용권 재예약은 허용하지 않습니다.',RECONCILIATION_REQUIRED:'실행·문항 기록이 확정되지 않아 수동 점검이 필요합니다.',BILLING_NOT_RESERVED:'이용권 예약 상태가 아니므로 기존 재시도를 실행할 수 없습니다.',NO_FAILED_QUESTIONS:'재시도할 확정 실패 문항이 없습니다.',TEST_NOT_VERIFIED:'검증된 테스트 요청이 아닙니다. 보관을 이용하세요.',CREDIT_LINKED:'이용권·원장이 연결되어 영구 삭제할 수 없습니다.',COMPLETED_RUN:'완료 결과는 삭제하지 않습니다. 보관을 이용하세요.',RELATED_RUNS:'연결된 첨삭 이력이 있어 삭제할 수 없습니다.',RELATED_EVALUATION:'평가·피드백·처리 기록이 연결되어 삭제할 수 없습니다.',ACTION_SUPERSEDED:'이 작업 이후 상태가 바뀌었습니다. 상태를 다시 확인하세요.',ACTION_KEY_CONFLICT:'작업 식별자가 충돌했습니다. 화면을 새로고침하세요.',RUN_NOT_FOUND:'요청이 이미 삭제되었거나 존재하지 않습니다.',ADMIN_REQUIRED:'관리자 권한이 필요합니다.',ACCESS_DENIED:'관리자 권한을 확인하세요.',ADMIN_REQUEST_REJECTED:'서버가 관리자 요청을 거절했습니다.',ADMIN_CONTRACT_PENDING:'관리 기능 DB 적용이 필요합니다.',REQUEST_UNCERTAIN:'서버 응답을 확인하지 못했습니다. 같은 작업 키로 다시 시도할 수 있습니다.',RUNTIME_UNAVAILABLE:'Worker가 요청을 처리하지 못했습니다. 상태 확인 후 같은 작업을 다시 시도하세요.'};
export const runActionReason=(code:string|null)=>code?(reasons[code]??'관리 작업을 완료하지 못했습니다. 상태를 다시 확인하세요.'):'';
export function AdminRunActions({run,onChanged}:{run:LabRun;onChanged:()=>void}){
 const {client}=useAuth();const [caps,setCaps]=useState<RunCapabilities|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false),keys=useRef<Partial<Record<string,string>>>({});
 async function inspect(){if(!client||lock.current)return;lock.current=true;setBusy(true);setError('');try{const result=await client.rpc('admin_lab_run_capabilities',{p_run:run.id});if(result.error||result.data?.version!=='admin-run-management-v1'||result.data.run_id!==run.id)throw Error('관리 상태를 조회하지 못했습니다. 관리자 권한 또는 DB 적용 상태를 확인하세요.');setCaps(result.data);}catch(e){setError(e instanceof Error?e.message:'관리 상태 조회 실패');}finally{lock.current=false;setBusy(false);}}
 async function act(action:'retry'|'delete'|'archive'|'restore'){
  if(!client||!caps||lock.current)return;
  const label={retry:'재진행',delete:'영구 삭제',archive:'보관',restore:'복원'}[action];
  const classification=caps.classification==='verified_test'?'검증된 테스트':caps.classification==='credit_linked'?'이용권 원장 연결 · 실사용 보호':'테스트 미검증 · 실사용 보호';
  if(!window.confirm(`${label} 확인\n${run.university??'대학 미확인'} · ${run.title??run.exam_id}\n요청 ID: ${run.id}\n상태: ${labState(caps.state)}\n구분: ${classification}\n이용권: ${caps.billing_status} / ${caps.credits_required}개 / 원장 ${caps.ledger_count}건\n이용권 판단 ID: ${caps.decision_id}\n${action==='delete'?'테스트 답안·요청·재시도 기록은 복구할 수 없습니다.':action==='retry'?'기존 답안·완료 문항·이용권 원장을 보존하여 실패 문항을 재시도합니다.':'학생 답안·결과·원장은 보존됩니다. 처리 작업은 중단되지 않습니다.'}\n서버에서 현재 상태를 다시 검증합니다. 계속할까요?`))return;
  lock.current=true;setBusy(true);setError('');const key=keys.current[action]??=crypto.randomUUID();
  try{
   let data;
   if(action==='retry'){
    const session=await client.auth.getSession();const token=session.data.session?.access_token;if(!token)throw Error('LOGIN_REQUIRED');
    const res=await fetch('/api/admin/essay-run',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({run_id:run.id,key})});data=await res.json();if(!res.ok)throw Error(data.code??'REQUEST_UNCERTAIN');
   }else{const result=await client.rpc('admin_lab_manage_run',{p_run:run.id,p_action:action,p_key:key});if(result.error)throw Error(result.error.message);data=result.data;}
   if(data?.version!=='admin-run-management-v1'||data.run_id!==run.id||data.action!==action)throw Error('REQUEST_UNCERTAIN');
   delete keys.current[action];setCaps(null);onChanged();window.dispatchEvent(new Event('admin-lab-changed'));
  }catch(e){setError(runActionReason(e instanceof Error?e.message:null));}finally{lock.current=false;setBusy(false);}
 }
 return <><button disabled={busy} onClick={()=>void inspect()}>{busy?'확인 중…':caps?'상태 새로고침':run.state==='completed'?'보관 · 상태 확인':'상태 확인 · 요청 관리'}</button>{error&&<p role="alert">{error}</p>}{caps&&<section aria-label="요청 관리" className="admin-panel lab-run-actions"><p>{caps.classification==='verified_test'?'검증된 테스트':caps.classification==='credit_linked'?'이용권 원장 연결 · 실사용 보호':'테스트 미검증 · 실사용 보호'} · {caps.retry_allowed?'중단된 처리 · 재진행 가능':labState(caps.state)} · 원장 {caps.ledger_count}건</p><p>확인 {formatDateTime(caps.as_of)} (KST)<br/>실행 잠금 만료 {formatDateTime(caps.lease_until)}<br/>최근 재시도 {formatDateTime(caps.retry_created_at)} · 잠금 만료 {formatDateTime(caps.retry_lease_until)}</p>
 <button disabled={busy||!caps.retry_allowed} onClick={()=>void act('retry')}>재진행</button>{!caps.retry_allowed&&<p>{runActionReason(caps.retry_reason)}</p>}
 <button disabled={busy||!caps.delete_allowed} onClick={()=>void act('delete')}>삭제</button>{!caps.delete_allowed&&<p>{runActionReason(caps.delete_reason)}</p>}
 <button disabled={busy} onClick={()=>void act(caps.hidden?'restore':'archive')}>{caps.hidden?'목록에 복원':'보관'}</button><button disabled={busy} onClick={()=>setCaps(null)}>닫기</button>
 </section>}</>;
}
