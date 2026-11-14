'use client';
import {useState} from 'react';
import {useReadReport} from './admin-dashboard-view';
import {formatDateTime} from '@/lib/admin/format';
import {labState,labAlerts,type LabDetail,type LabList} from '@/lib/admin/lab-operations';
import {examReports,examQuestionLabel} from '@/lib/my/exam-history';
import {EvaluationReport} from '@/components/my/evaluation-report';
import {QlStructuredValue} from '@/components/quality/quality-primitives';

const questionLabel=(id:string)=>{const label=examQuestionLabel(id);return label==='문항별 첨삭'?`문항 ID ${id}`:label;};

export function AdminLabOperations({accountId}:{accountId?:string}){
 const [offset,setOffset]=useState(0),[university,setUniversity]=useState(''),[status,setStatus]=useState(''),[source,setSource]=useState(''),[selected,setSelected]=useState<string|null>(null),[refresh,setRefresh]=useState(0);
 const r=useReadReport<LabList>('admin_lab_runs',{p_user:accountId??null,p_university:university||null,p_exam:null,p_state:status||null,p_source:source||null,p_offset:offset},refresh);
 const change=(set:(s:string)=>void,value:string)=>{set(value);setOffset(0);setSelected(null);};
 return <section className="admin-section"><h3>논술 LAB 이용 현황</h3><p>시험 회차 기준입니다. 이용권 거래·문항 수 및 이전 단일 문항 평가는 별도입니다.</p>
 <div className="admin-filters__row"><label>대학 <select value={university} onChange={e=>change(setUniversity,e.target.value)}><option value="">전체 대학</option>{r.data?.universities?.map(u=><option key={u.university_id} value={u.university_id}>{u.university}</option>)}</select></label>
 <label>상태 <select value={status} onChange={e=>change(setStatus,e.target.value)}><option value="">전체 상태</option><option value="completed">완료</option><option value="reserved">진행 중</option><option value="failed">실패</option></select></label>
 <label>이용권 출처 <select value={source} onChange={e=>change(setSource,e.target.value)}><option value="">전체 출처</option><option value="beta">베타 발급 연결</option><option value="other">베타 발급 연결 없음</option></select></label><button onClick={()=>setRefresh(x=>x+1)}>새로고침</button></div>
 {r.error||(r.data&&r.data.version!=='admin-lab-v1')?<p role="alert">첨삭 현황을 조회하지 못했습니다. 관리자 권한·조회 연결을 확인한 후 다시 시도하세요.</p>:!r.data?<p role="status">첨삭 현황 조회 중…</p>:<>
 <dl className="admin-detail__grid">{Object.entries({initial:'최초·후속 유료 요청',completed:'완료',pending:'진행 중',failed:'실패',free_revisions:'무료 재첨삭 요청',beta_credit:'베타 발급 연결'}).map(([k,label])=><div key={k}><dt>{label}</dt><dd>{r.data!.summary[k as keyof LabList['summary']]}회</dd></div>)}</dl>
 <p>최근 요청 {formatDateTime(r.data.summary.last_requested_at)} · 최근 이용권 차감 {formatDateTime(r.data.summary.last_consumed_at)}</p>
 <div className="admin-table-scroll"><table className="admin-table"><caption>{r.data.total}회 · 최근 요청순</caption><thead><tr><th>대학·시험</th><th>요청 / 완료 (KST)</th><th>상태</th><th>이용권·회차</th><th>상세</th></tr></thead><tbody>{r.data.items.map(x=><tr key={x.id}><td>{x.university??'대학 확인 불가'}<br/>{x.title??x.exam_id}</td><td>{formatDateTime(x.created_at)}<br/>{formatDateTime(x.completed_at)}</td><td>{labState(x.state)} · 결과 {x.result_question_count}/{x.question_count}문항</td><td>{x.free_revision?'무료 재첨삭':x.parent_id?'재첨삭·과금 확인 필요':'최초·후속 유료 회차'}<br/>{x.beta_credit?'베타 발급 연결':'베타 발급 연결 없음'}</td><td><button onClick={()=>setSelected(x.id)}>첨삭 상세 보기</button></td></tr>)}</tbody></table></div>
 {!r.data.items.length&&<p>조건에 맞는 첨삭 요청이 없습니다.</p>}
 <button disabled={!offset} onClick={()=>{setOffset(Math.max(0,offset-25));setSelected(null);}}>이전</button> <span>{Math.floor(offset/25)+1}페이지</span> <button disabled={offset+25>=r.data.total} onClick={()=>{setOffset(offset+25);setSelected(null);}}>다음</button>
 </>}{selected&&<AdminLabDetail key={selected} runId={selected} onSelect={setSelected}/>}</section>;
}
export function AdminLabDetail({runId,onSelect}:{runId:string;onSelect:(id:string)=>void}){
 const [refresh,setRefresh]=useState(0);const r=useReadReport<LabDetail>('admin_lab_run_detail',{p_run:runId},refresh);
 if(r.error||(r.data&&r.data.version!=='admin-lab-detail-v1'))return <p role="alert">첨삭 상세 조회 불가 — 관리자 권한·계정 상태·원본 기록을 확인하세요. <button onClick={()=>setRefresh(x=>x+1)}>다시 시도</button></p>;
 if(!r.data)return <p role="status">저장된 답안·첨삭 결과 조회 중…</p>;
 const d=r.data,run=d.run;let reports:ReturnType<typeof examReports>=[];let parseError=false;try{reports=examReports(run);}catch{parseError=true;}
 const answers=Array.isArray(run.answers)?run.answers as {questionId:string;body?:string;rubricVersion?:string;evidenceVersion?:string}[]:[];
 return <section className="admin-section"><h3>{String(run.university??'')} · {String(run.title??'첨삭 상세')}</h3><p>회원 {d.user_id} · {String(run.year??'')}학년도 · {labState(String(run.state))} · 읽기 전용</p>
 <p>요청 {formatDateTime(String(run.created_at))} · 완료 {formatDateTime(typeof run.completed_at==='string'?run.completed_at:null)}</p>
 <ul>{labAlerts(d).map(s=><li key={s}>{s}</li>)}</ul>
 <h4>처리 과정</h4><ol><li>요청 생성: {formatDateTime(String(run.created_at))}</li><li>이용권 확인: {d.billing?`${d.billing.reason} · ${d.billing.credits_required}회 · ${d.billing.status}`:'기록 없음'}</li><li>예약: {formatDateTime(d.billing?.reserved_at??null)} / 정산: {formatDateTime(d.billing?.settled_at??null)} / 해제: {formatDateTime(d.billing?.released_at??null)}</li><li>평가 호출: {d.calls.length?`${d.calls.length}건 (아래 처리 정보)`:'확인 불가 — 호출 기록 없음'}</li><li>결과 저장: {reports.length?`${reports.length}문항 표시 가능`:parseError?'저장 형식 표시 불가 — 원본 확인 필요':'표시 가능한 완료 결과 없음'}</li><li>사용자 결과 열람: 확인 불가 — 회차별 확정 열람 기록 미연결</li></ol>
 {typeof run.parent_id==='string'&&<button onClick={()=>onSelect(String(run.parent_id))}>연결된 최초 첨삭 보기</button>}
 {d.children.map(c=><p key={c.id}><button onClick={()=>onSelect(c.id)}>재첨삭 {formatDateTime(c.at)} · {labState(c.state)}</button></p>)}
 <h4>이용권 거래</h4>{d.ledger.length?<ul>{d.ledger.map(t=><li key={t.id}>{formatDateTime(t.at)} · {t.type} · 잔액 {t.balance_delta} / 예약 {t.reserved_delta} · {t.origin} {t.reversal_of?'(이전 거래 역분개)':''}</li>)}</ul>:<p>거래 기록 없음</p>}
 <h4>처리 정보</h4>{d.calls.length?<ul>{d.calls.map(c=><li key={c.call_id}>{c.provider??'Provider 미기록'} / {c.model??'모델 미기록'} · {formatDateTime(c.called_at)} · {c.duration_seconds===null?'처리 시간 미기록':`${c.duration_seconds}초`} · {c.call_state??'상태 미기록'} · {c.cost_usd===null?'비용 미기록':`USD ${c.cost_usd} (${c.cost_status})`}</li>)}</ul>:<p>Provider·모델·비용 호출 기록 없음</p>}
 {d.retries.map(t=><p key={t.generation}>재처리 요청 {t.generation} · {formatDateTime(t.at)}</p>)}{d.diagnostics.map((x,i)=><p key={i}>기록된 오류: {x.stage??'단계 미기록'} / {x.code??'코드 미기록'}</p>)}
 {parseError&&<p role="alert">저장된 결과를 기존 결과 화면으로 표시하지 못했습니다. 문항별 원본을 아래에서 확인할 수 있습니다.</p>}
 {answers.map(a=><section key={a.questionId}><h4>{questionLabel(a.questionId)} · {run.parent_id?'재작성 답안':'제출 답안'}</h4><p style={{whiteSpace:'pre-wrap'}}>{a.body??'텍스트 답안 없음'}</p><p>당시 기준 {a.rubricVersion??'미기록'} · 근거 {a.evidenceVersion??'미기록'}</p><a href={`/ql/?run=${encodeURIComponent(runId)}&question=${encodeURIComponent(a.questionId)}`}>{d.reviewed_questions.includes(a.questionId)?'기존 품질 검수 이력 보기':'기존 품질 검수로 이동'}</a></section>)}
 {reports.map(report=><EvaluationReport key={report.id} report={report} title={questionLabel(report.id.split('/').at(-1)!)}/>)}
 <details><summary>저장된 문항별 평가·기준 원본 확인</summary><QlStructuredValue value={run.result}/></details>
 </section>;
}
