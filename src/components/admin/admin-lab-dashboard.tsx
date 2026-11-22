'use client';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {useReadReport,FocusSection} from './admin-dashboard-view';
import {AdminPeriodFilter} from './admin-period-filter';
import {analyticsWindow} from '@/lib/admin/analytics';
import {LabStatusCards} from './admin-lab-warning-strip';
import {KpiTile} from './kpi-tile';
import {labDashboardRange,labDashboardHref,completionRate,durationLabel,activityDuration,memberLabel,dashboardNumber as number,type LabDashboardPeriod,type LabDashboardSummary} from '@/lib/admin/lab-dashboard';
import {labState,type LabList} from '@/lib/admin/lab-operations';
import type {OperationsReport} from '@/lib/admin/monitoring';
import {formatDateTime} from '@/lib/admin/format';
import {LabDashboardQuality,LabDashboardFinance} from './lab-dashboard-secondary';
import './member-dashboard.css';
import './admin-lab-dashboard.css';
export type DashboardRead<T>={data?:T;error?:boolean};
export function DashboardResult<T>({read,onRetry,children}:{read:DashboardRead<T>;onRetry:()=>void;children:(data:T)=>ReactNode}){
 if(read.error)return <p role="alert">이 영역을 조회하지 못했습니다. <button onClick={onRetry}>다시 시도</button></p>;
 if(!read.data)return <p role="status">집계 중…</p>;
 return children(read.data);
}
export function AdminLabDashboard(){
 const [period,setPeriod]=useState<LabDashboardPeriod>('d7'),[source,setSource]=useState(''),[refresh,setRefresh]=useState(0);
 const [countsRefresh,setCountsRefresh]=useState(0),[listRefresh,setListRefresh]=useState(0),[opsRefresh,setOpsRefresh]=useState(0),[feedbackRefresh,setFeedbackRefresh]=useState(0);
 const [from,setFrom]=useState(''),[to,setTo]=useState('');
 useEffect(()=>{const update=()=>setRefresh(n=>n+1);window.addEventListener('admin-lab-changed',update);return()=>window.removeEventListener('admin-lab-changed',update);},[]);
 const [secondary,setSecondary]=useState(false);
 const now=useMemo(()=>{void refresh;return new Date();},[refresh]);
 const custom=period==='custom'?analyticsWindow('custom',from,to,now):null;
 const valid=period!=='custom'||!!(custom&&Date.parse(custom.p_to)-Date.parse(custom.p_from)<=93*86400000);
 const range=period==='custom'?(custom??{p_from:null,p_to:null}):labDashboardRange(period,now),fixed=labDashboardRange('d7',now);
 const summary=useReadReport<LabDashboardSummary>('admin_lab_dashboard_summary',valid?{...range,p_source:source||null}:null,refresh+countsRefresh);
 const list=useReadReport<LabList>('admin_lab_runs_filtered',valid?{...range,p_user:null,p_university:null,p_exam:null,p_state:null,p_source:source||null,p_offset:0,p_query:''}:null,refresh+listRefresh);
 const ops7=useReadReport<OperationsReport>('admin_essay_operations',{...fixed,p_filters:{},p_offset:0,p_run:null},refresh+opsRefresh);
 // d7 KPI/status/cost share one query; all-time is not supported by this existing RPC.
 const otherOps=useReadReport<OperationsReport>('admin_essay_operations',!valid||period==='d7'||period==='all'?null:{...range,p_filters:{},p_offset:0,p_run:null},refresh+opsRefresh);
 const ops=period==='d7'?ops7:otherOps;
 const feedback=useReadReport<{stats:{pending:number}}>('admin_essay_feedback',{p:{status:'new'}},refresh+feedbackRefresh);
 const reviewing=useReadReport<{stats:{pending:number}}>('admin_essay_feedback',{p:{status:'reviewing'}},refresh+feedbackRefresh);
 const pendingFeedback=useReadReport<{stats:{pending:number}}>('admin_essay_feedback',{p:{}},refresh+feedbackRefresh);
 const retryCounts=()=>setCountsRefresh(n=>n+1),retryList=()=>setListRefresh(n=>n+1);
 const data=summary.data?.version==='admin-lab-dashboard-v1'?summary.data:undefined;
 const runs=list.data?.version==='admin-lab-filtered-v1'?list.data:undefined;
 const val=(r:{error?:boolean;data?:unknown},n:unknown,suffix='')=>r.error?'조회 실패':!r.data?'집계 중…':number(n,suffix);
 const scope=period==='all'?'전체 기간 접수':'선택 기간 접수';
 return <div className="focused-admin lab-dashboard">
 <section aria-label="논술 LAB 핵심 지표"><div className="focus-toolbar"><AdminPeriodFilter label="조회 기간 (KST)" period={period} from={from} to={to} options={['today','d7','d30','all','custom']} onChange={(p,f,t)=>{setPeriod(p as LabDashboardPeriod);setFrom(f);setTo(t);}}/>{!valid&&<p role="alert">시작일과 종료일을 입력하고 93일 이내로 선택하세요.</p>}<label>이용권 출처 <select value={source} onChange={e=>setSource(e.target.value)}><option value="">전체</option><option value="beta">베타 발급 연결</option><option value="other">베타 발급 연결 없음</option></select></label><button onClick={()=>setRefresh(n=>n+1)}>전체 새로고침</button></div>
 <h2>기간별 이용 현황</h2><p className="focus-note">{scope} · {source==='beta'?'베타 발급 연결':source==='other'?'베타 발급 연결 없음':'전체 출처'} · 보관 포함</p><details className="lab-metric-help"><summary>집계 기준·필터 안내</summary><p>출처 필터는 이용 학생·요청·완료·실패·평균 시간·최근 활동·대학 순위에 적용합니다. 베타 발급 연결은 TEST/LIVE 구분이 아닙니다.</p><p>완료율은 선택 기간 접수 요청 중 현재 완료 비율입니다. 처리 중은 미완료이며 실패를 뜻하지 않습니다. 평균은 완료 요청의 최초 요청→최종 완료 시간으로 재시도·대기를 포함합니다.</p><p>마지막 갱신 {formatDateTime(now.toISOString())} (KST) · 새로고침 시점의 상태와 경과 시간입니다.</p></details>
 <div className="focus-kpis">
 <KpiTile label="이용 학생 수" value={val(summary,data?.students,'명')} note={`${scope} · 고유 회원`}/>
 <KpiTile label="첨삭 요청" value={val(list,runs?.summary.requested,'회')} note={`${scope} · 회차`} href={labDashboardHref(range,source)}/>
 <KpiTile label="첨삭 완료" value={val(list,runs?.summary.completed,'회')} note={`${scope} 중 현재 완료`} href={labDashboardHref(range,source,{state:'completed'})}/>
 <KpiTile label="완료율" value={list.error?'조회 실패':!runs?'집계 중…':completionRate(runs.summary.requested,runs.summary.completed)} note="현재 완료 ÷ 기간 내 요청"/>
 <KpiTile label="평균 처리 시간" value={summary.error?'조회 실패':!data?'집계 중…':durationLabel(data.avg_seconds)} note={`재시도·대기 포함 · 완료 ${data?.duration_samples??'확인 중'}회`}/>
 </div><p className="lab-period-failure"><Link href={labDashboardHref(range,source,{state:'failed'})}>기간 내 첨삭 실패 {val(list,runs?.summary.failed,'회')} →</Link></p></section>
 <LabStatusCards compactPeriod range={valid?range:null} refresh={refresh+opsRefresh} report={ops7} feedback={pendingFeedback} onRefresh={()=>{setOpsRefresh(n=>n+1);setFeedbackRefresh(n=>n+1);}}/>
 <FocusSection title="최근 첨삭 활동" href={labDashboardHref(range,source)}><p className="focus-note">선택 조건의 최근 요청 10건 · 재시도 이력·실행 잠금은 요청 상세에서 확인합니다.</p><p className="focus-note">15분 이상 미완료는 ‘지연 확인 필요’ 후보이며 중단·실패 판정이 아닙니다. 보관 여부는 관리 화면에서 확인하세요.</p><DashboardResult read={list} onRetry={retryList}>{r=><>{r.items.length?<div className="admin-table-scroll"><table className="lab-activity"><thead><tr>{['요청 시각 (KST)','회원','대학·시험','처리 시간','상태','관리'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{r.items.slice(0,10).map(x=>{const duration=activityDuration(x,now.getTime());return <tr key={x.id}><td data-label="요청 시각">{formatDateTime(x.created_at)}</td><td data-label="회원"><span title={x.user_id}>{memberLabel(x.user_id)}</span></td><td data-label="대학·시험"><strong>{x.university??'대학 확인 불가'}</strong><small>{x.title??x.exam_id}</small><small>{x.free_revision?'무료 재첨삭':x.free_revision===false?'일반 회차':'과금 확인 불가'} · {x.beta_credit?'베타 발급 연결':'베타 발급 연결 없음'}</small></td><td data-label="처리 시간">{duration.label}{duration.delayed&&<small className="lab-delay">지연 확인 필요</small>}</td><td data-label="상태"><span className={`lab-state lab-state--${['completed','failed','reserved'].includes(x.state)?x.state:'unknown'}`}>{labState(x.state)}</span></td><td data-label="관리"><Link href={labDashboardHref(range,source,{run:x.id})}>첨삭 상세 보기</Link></td></tr>;})}</tbody></table></div>:<p>조건에 맞는 첨삭 요청이 없습니다.</p>}</>}</DashboardResult></FocusSection>
 <FocusSection title="대학별 이용 현황"><p className="focus-note">요청 수 내림차순 · 동률은 대학명·ID순. 같은 학생은 대학별로 각각 포함되어 대학별 학생 수의 합이 전체 고유 학생 수와 다를 수 있습니다.</p><DashboardResult read={summary} onRetry={retryCounts}>{s=><>{s.universities.length?<div className="admin-table-scroll"><table><thead><tr>{['대학','요청','고유 학생','완료','실패','무료 재첨삭','베타 연결'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{s.universities.map(u=><tr key={u.university_id??'unknown'}><td>{u.university_id?<Link href={labDashboardHref(range,source,{university:u.university_id})}>{u.university??u.university_id}</Link>:'대학 확인 불가'}</td>{[u.requests,u.students,u.completed,u.failed,u.free_revisions,u.beta_requests].map((n,i)=><td key={i}>{number(n)}</td>)}</tr>)}</tbody></table></div>:<p>조건에 맞는 대학 이용 기록이 없습니다.</p>}</>}</DashboardResult></FocusSection>
 <FocusSection title="학생 피드백" href="/admin/essay-feedback/"><p className="focus-note">기간·출처 무관 · 현재 접수 상태. 만족도 평균은 점수 계약이 없어 표시하지 않습니다.</p><div className="lab-secondary-grid"><DashboardResult read={feedback} onRetry={()=>setFeedbackRefresh(n=>n+1)}>{f=><KpiTile label="신규 피드백" value={number(f.stats.pending,'건')} href="/admin/essay-feedback/?status=new"/>}</DashboardResult><DashboardResult read={reviewing} onRetry={()=>setFeedbackRefresh(n=>n+1)}>{f=><KpiTile label="확인 중 피드백" value={number(f.stats.pending,'건')} href="/admin/essay-feedback/?status=reviewing"/>}</DashboardResult></div></FocusSection>
 <>{valid&&<LabDashboardQuality range={range} refresh={refresh}/>}</>
 {!secondary?<section className="focus-section"><div className="focus-body"><h2>이용권·매출·비용</h2><p>선택 기간의 기존 원장·결제·비용 요약을 조회합니다.</p><button onClick={()=>setSecondary(true)}>이용권·매출·비용 불러오기</button></div></section>:<LabDashboardFinance range={range} ops={ops} refresh={refresh} onOpsRetry={()=>setOpsRefresh(n=>n+1)}/>}
 </div>;
}
