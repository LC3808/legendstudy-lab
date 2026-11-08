"use client";
import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {adminErrorCopy,adminErrorKind} from '@/lib/admin/errors';
import {syncStatus,requestSync,syncTime,syncState,syncReasons,type SyncStatus} from '@/lib/admin/material-sync';
const metrics=[['new_posts','신규 게시글'],['modified_posts','수정 게시글'],['added_attachments','추가 첨부'],['replaced_attachments','URL 교체 첨부'],['removed_attachments','목록에서 제외한 첨부'],['unchanged_posts','변경 없는 게시글']] as const;
export function AdminMaterialSync(){const {user}=useAuth();return <SyncView key={user?.id??'signed-out'}/>;}
function SyncView(){
 const {client,user}=useAuth();const [data,setData]=useState<SyncStatus|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
 const pending=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(!client||!user)return;let active=true;
 const load=async()=>{try{const d=await syncStatus(client);if(active){setData(d);setError('');}}catch(e){if(active){setData(null);setError(adminErrorCopy(adminErrorKind(e)).body);}}};
 void load();const id=setInterval(()=>void load(),15000);return()=>{active=false;clearInterval(id);};},[client,user,refresh]);
 async function start(){if(!client||pending.current)return;pending.current=true;setBusy(true);setError('');try{const r=await requestSync(client);if(alive.current){setMessage(r.accepted?'갱신 요청을 등록했습니다. 다음 실행 점검을 기다리고 있습니다.':'이미 갱신이 대기 중이거나 실행 중입니다.');setRefresh(x=>x+1);}}catch(e){if(alive.current)setError(adminErrorCopy(adminErrorKind(e)).body);}finally{pending.current=false;if(alive.current)setBusy(false);}}
 const activeRun=data?.runs.find(r=>['queued','running'].includes(r.status));const latest=data?.runs.find(r=>r.finished_at);
 return <section className="admin-section" aria-label="학습자료 동기화">
 <div style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}><h2>학습자료 동기화</h2><div style={{display:'flex',gap:8}}><button className="button button--outline" onClick={()=>setRefresh(x=>x+1)}>상태 새로고침</button><button className="button button--primary" disabled={!data?.enabled||!!activeRun||busy} onClick={()=>void start()}>{busy?'요청 중…':'지금 갱신'}</button></div></div>
 <p>자동·수동 갱신은 동일한 자료 수집기를 사용합니다. 기존 자료 ID와 사용자 저장 기록은 유지합니다.</p>
 <p>요청 후 GitHub가 다음 점검에서 실행합니다(통상 5분 간격, GitHub 지연 가능). 이 화면은 15초마다 상태를 확인합니다.</p>
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}{!data&&!error&&<p role="status">현황 조회 중…</p>}
 {data&&<>
 <dl style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}>{[
 ['자동 동기화',data.enabled?'활성':'중지'],['실행 주기','72시간'],['현재 상태',activeRun?syncState[activeRun.status]:'대기'],
 ['마지막 실행 시작',syncTime(data.runs.find(r=>r.started_at)?.started_at??null)],['마지막 정상 처리 완료',syncTime(data.last_success_at)],
 ['다음 자동 실행 기준',syncTime(data.next_due_at)],['실패 재시도 기준',data.next_retry_at?syncTime(data.next_retry_at):'해당 없음'],['실행기 마지막 연결',syncTime(data.last_poll_at)]
 ].map(([label,value])=><div className="admin-panel" key={label}><dt>{label}</dt><dd style={{margin:0,fontWeight:700}}>{value}</dd></div>)}</dl>
 <p>첫 기준은 04:00 KST이며, 정상 처리 완료 후 72시간 뒤에 다시 실행합니다. 검토 보류는 기존 자료를 보존하며, 조회·저장 실패와 구분합니다. 수동 실행은 자동 주기를 변경하지 않습니다.</p>
 <h3>최근 완료 실행 결과</h3>
 {latest?<><p>{syncTime(latest.finished_at)} · {syncState[latest.status]??latest.status}</p><dl style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
 {metrics.map(([key,label])=><div className="admin-panel" key={key}><dt>{label}</dt><dd style={{margin:0}}>{latest.summary?.metrics?.[key]??(latest.summary?.metrics?0:'세부 집계 미기록')}</dd></div>)}
 <div className="admin-panel"><dt>실행 실패</dt><dd>{latest.summary?.counts?.failed??0}건</dd></div><div className="admin-panel"><dt>검토 보류</dt><dd>{latest.summary?.counts?.review??0}건</dd></div></dl>
 {latest.summary?.error_code&&<p role="alert">{syncReasons[latest.summary.error_code]??latest.summary.error_code}</p>}
 <p>교체는 기존 첨부 ID의 URL 변경입니다. 다른 첨부 ID로 대체된 경우 추가·제외에 각각 집계합니다. 제외된 첨부의 기존 기록은 삭제하지 않습니다.</p></>:<p>완료된 실행이 없습니다.</p>}
 <h3>최근 실행 이력</h3><div style={{overflowX:'auto'}}><table className="admin-table"><thead><tr><th>요청 시각 (KST)</th><th>실행 방식</th><th>상태</th><th>시작</th><th>완료</th></tr></thead><tbody>{data.runs.map(r=><tr key={r.id}><td>{syncTime(r.requested_at)}</td><td>{r.trigger_name==='schedule'?'자동':r.trigger_name==='admin'?'관리자':'최초 연결 검증'}</td><td>{syncState[r.status]??r.status}</td><td>{syncTime(r.started_at)}</td><td>{syncTime(r.finished_at)}</td></tr>)}</tbody></table></div>
 <h3>최근 실패·검토 사유</h3>{data.issues.length?<div style={{overflowX:'auto'}}><table className="admin-table"><thead><tr><th>원본 게시글</th><th>구분</th><th>사유</th><th>확인 시각</th></tr></thead><tbody>{data.issues.map(i=><tr key={i.post_id}><td>{i.post_id}</td><td>{i.status==='failed'?'실행 실패':'검토 보류'}</td><td>{syncReasons[i.error_code]??i.error_code}</td><td>{syncTime(i.observed_at)}</td></tr>)}</tbody></table></div>:<p>기록된 오류가 없습니다.</p>}
 </>}
 </section>;
}
