'use client';
import {useMemo,useState} from 'react';
import {useReadReport} from './admin-dashboard-view';
import {analyticsWindow} from '@/lib/admin/analytics';
import {recoveryDate,recoveryHref,recoveryReason,recoveryState,type RecoveryOperations} from '@/lib/admin/run-recovery';
import './admin-run-recovery.css';

type Range={p_from:string|null;p_to:string|null};
export function AdminRecoveryOperations({range,refresh=0}:{range:Range|null;refresh?:number}){
 const [revision,setRevision]=useState(0);
 const fallback=useMemo(()=>{void refresh;void revision;return analyticsWindow('d7')!;},[refresh,revision]);
 const selected=!!(range?.p_from&&range.p_to),window=selected?range!:fallback;
 const read=useReadReport<RecoveryOperations>('admin_lab_recovery_operations',window,refresh+revision);
 const d=read.data?.version==='admin-run-recovery-v1'?read.data:null;
 const valid=d&&[d.attention_total,d.stale_lease_count,d.recover_success,d.attention_limit].every(n=>Number.isSafeInteger(n)&&n>=0)&&Array.isArray(d.attention)&&Array.isArray(d.recovery_history);
 return <section className="lab-recovery" aria-label="첨삭 복구 운영 현황"><h3>확인이 필요한 요청 · 복구 현황</h3>
 <p>현재 확인 대상은 기간·이용권 출처와 관계없이 조회합니다. 유효한 실행 잠금이 없다는 뜻이며 Worker 중단이나 안전한 재실행이 확정된 것은 아닙니다.</p>
 <button onClick={()=>setRevision(n=>n+1)}>복구 현황 새로고침</button>
 {read.error||(read.data&&!valid)?<p role="alert">복구 운영 현황을 조회하지 못했습니다. 기존 첨삭 현황은 별도로 확인할 수 있습니다.</p>:!valid?<p role="status">복구 운영 현황 조회 중…</p>:<>
 <p>마지막 갱신 {recoveryDate(d.as_of)} (KST)</p>
 <dl className="lab-recovery__facts"><div><dt>현재 확인이 필요한 요청</dt><dd>{d.attention_total}건 · 전체 기간 · 보관 제외</dd></div><div><dt>실행 잠금 만료 후 15분 이상 경과</dt><dd>{d.stale_lease_count}건 · 전체 기간 · 시각 미기록 제외</dd></div><div><dt>복구 후 실제 완료</dt><dd>{d.recover_success}건 · {selected?'선택 기간':'최근 7일'} 완료 기준</dd></div></dl>
 <p>복구 집계 기간 {recoveryDate(window.p_from)} ~ {recoveryDate(new Date(Date.parse(window.p_to!)-1).toISOString())} (KST). 검증 대기·재진행 접수만으로 완료에 포함하지 않습니다. 복구 작업에 연결된 실제 완료 요청을 중복 없이 집계합니다.</p>
 {!selected&&<p>전체 기간 또는 미완성 기간 선택 시 복구 완료·이력은 최근 7일로 표시합니다. 현재 확인 대상은 계속 전체 기간입니다.</p>}
 {d.attention.length?<><p>확인 대상 중 최대 {d.attention_limit}건 표시 · 전체 {d.attention_total}건</p><div className="admin-table-scroll"><table className="admin-table"><caption>복구 진단이 필요한 요청</caption><thead><tr><th>요청</th><th>생성 / 잠금 만료 (KST)</th><th>저장 완료</th><th>확인 사유</th></tr></thead><tbody>{d.attention.map(a=><tr key={a.run_id}><td><a href={recoveryHref(a.run_id)}>첨삭 복구·완료 진단</a><br/>{a.run_id}</td><td>{recoveryDate(a.created_at)}<br/>{recoveryDate(a.lease_until)}</td><td>{a.question_completed}/{a.question_total}문항</td><td>{recoveryReason(a.reason)}</td></tr>)}</tbody></table></div></>:<p>현재 확인 대상 없음</p>}
 <details><summary>최근 복구 작업 이력 · {d.recovery_history.length}건</summary>{d.recovery_history.length?<ul>{d.recovery_history.map((h,i)=><li key={`${h.action_id}:${i}`}><a href={recoveryHref(h.run_id)}>요청 진단·처리 결과</a> · {recoveryDate(h.recorded_at)} · {recoveryState(h.state)}{h.reason&&` · ${recoveryReason(h.reason)}`}</li>)}</ul>:<p>집계 기간의 복구 작업 기록 없음</p>}</details>
 </>}
 </section>;
}
