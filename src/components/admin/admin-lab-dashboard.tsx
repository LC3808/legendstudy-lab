'use client';
import {useMemo,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {useReadReport,FocusSection} from './admin-dashboard-view';
import {LabStatusCards} from './admin-lab-warning-strip';
import {KpiTile} from './kpi-tile';
import {labDashboardRange,labDashboardHref,dashboardNumber as number,type LabDashboardPeriod,type LabDashboardSummary} from '@/lib/admin/lab-dashboard';
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
 const [secondary,setSecondary]=useState(false);
 const now=useMemo(()=>{void refresh;return new Date();},[refresh]);
 const range=labDashboardRange(period,now),fixed=labDashboardRange('d7',now);
 const summary=useReadReport<LabDashboardSummary>('admin_lab_dashboard_summary',{...range,p_source:source||null},refresh+countsRefresh);
 const list=useReadReport<LabList>('admin_lab_runs_filtered',{...range,p_user:null,p_university:null,p_exam:null,p_state:null,p_source:source||null,p_offset:0,p_query:''},refresh+listRefresh);
 const ops7=useReadReport<OperationsReport>('admin_essay_operations',{...fixed,p_filters:{},p_offset:0,p_run:null},refresh+opsRefresh);
 // d7 KPI/status/cost share one query; all-time is not supported by this existing RPC.
 const otherOps=useReadReport<OperationsReport>('admin_essay_operations',period==='d7'||period==='all'?null:{...range,p_filters:{},p_offset:0,p_run:null},refresh+opsRefresh);
 const ops=period==='d7'?ops7:otherOps;
 const feedback=useReadReport<{stats:{pending:number}}>('admin_essay_feedback',{p:{status:'new'}},refresh+feedbackRefresh);
 const reviewing=useReadReport<{stats:{pending:number}}>('admin_essay_feedback',{p:{status:'reviewing'}},refresh+feedbackRefresh);
 const retryCounts=()=>setCountsRefresh(n=>n+1),retryList=()=>setListRefresh(n=>n+1);
 const data=summary.data?.version==='admin-lab-dashboard-v1'?summary.data:undefined;
 const runs=list.data?.version==='admin-lab-filtered-v1'?list.data:undefined;
 const val=(r:{error?:boolean;data?:unknown},n:unknown,suffix='')=>r.error?'조회 실패':!r.data?'집계 중…':number(n,suffix);
 const scope=period==='all'?'전체 기간 접수':'선택 기간 접수';
 return <div className="focused-admin lab-dashboard">
 <section aria-label="논술 LAB 핵심 지표"><div className="focus-toolbar"><label>조회 기간 (KST) <select value={period} onChange={e=>setPeriod(e.target.value as LabDashboardPeriod)}><option value="today">오늘</option><option value="d7">최근 7일</option><option value="d30">최근 30일</option><option value="all">전체 기간</option></select></label><label>이용권 출처 <select value={source} onChange={e=>setSource(e.target.value)}><option value="">전체</option><option value="beta">베타 발급 연결</option><option value="other">베타 발급 연결 없음</option></select></label><button onClick={()=>setRefresh(n=>n+1)}>전체 새로고침</button></div>
 <p className="focus-note">출처 필터는 이용 학생·요청·완료·실패·평균 시간·최근 활동·대학 순위에 적용합니다. 베타 발급 연결은 TEST/LIVE 구분이 아닙니다.</p>
 <div className="focus-kpis">
 <KpiTile label="이용 학생 수" value={val(summary,data?.students,'명')} note={`${scope} · 고유 회원`}/>
 <KpiTile label="첨삭 요청" value={val(list,runs?.summary.requested,'회')} note={`${scope} · 회차`} href={labDashboardHref(range,source)}/>
 <KpiTile label="첨삭 완료" value={val(list,runs?.summary.completed,'회')} note={`${scope} 중 현재 완료`} href={labDashboardHref(range,source,{state:'completed'})}/>
 <KpiTile label="첨삭 실패" value={val(list,runs?.summary.failed,'회')} note={`${scope} 중 현재 실패`} href={labDashboardHref(range,source,{state:'failed'})}/>
 <KpiTile label="현재 처리 중" value={val(ops7,ops7.data?.live.processing,'회')} note="기간·출처 무관 · 현재 예약 상태" href="/admin/essay-runs/?state=reserved"/>
 <KpiTile label="평균 처리 시간" value={data?.avg_seconds===null?'기록 없음':val(summary,data?.avg_seconds,'초')} note={`${scope} 중 완료 · 요청→완료 · 유효 시각 ${data?.duration_samples??'확인 중'}회`}/>
 </div></section>
 <LabStatusCards report={ops7} feedback={feedback} onRefresh={()=>{setOpsRefresh(n=>n+1);setFeedbackRefresh(n=>n+1);}}/>
 <FocusSection title="최근 첨삭 활동" href={labDashboardHref(range,source)}><p className="focus-note">선택 조건의 최근 요청 10건 · 서버 최신순 첫 페이지에서 표시합니다.</p><DashboardResult read={list} onRetry={retryList}>{r=><>{r.items.length?<div className="admin-table-scroll"><table className="lab-activity"><thead><tr>{['요청 시각 (KST)','회원','대학·시험','첨삭 유형','상태','상세'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{r.items.slice(0,10).map(x=><tr key={x.id}><td data-label="요청 시각">{formatDateTime(x.created_at)}</td><td data-label="회원"><span title={x.user_id}>{x.email??x.user_id}</span></td><td data-label="대학·시험">{x.university??'대학 확인 불가'}<br/>{x.title??x.exam_id}</td><td data-label="첨삭 유형">{x.free_revision?'무료 재첨삭':x.free_revision===false?'일반 회차':'과금 확인 불가'}<br/>{x.beta_credit?'베타 발급 연결':'베타 발급 연결 없음'}</td><td data-label="상태">{labState(x.state)}</td><td><Link href={labDashboardHref(range,source,{run:x.id})}>첨삭 상세 보기</Link></td></tr>)}</tbody></table></div>:<p>조건에 맞는 첨삭 요청이 없습니다.</p>}</>}</DashboardResult></FocusSection>
 <FocusSection title="대학별 이용 현황"><p className="focus-note">요청 수 내림차순 · 동률은 대학명·ID순. 같은 학생은 대학별로 각각 포함되어 대학별 학생 수의 합이 전체 고유 학생 수와 다를 수 있습니다.</p><DashboardResult read={summary} onRetry={retryCounts}>{s=><>{s.universities.length?<div className="admin-table-scroll"><table><thead><tr>{['대학','요청','고유 학생','완료','실패','무료 재첨삭','베타 연결'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{s.universities.map(u=><tr key={u.university_id??'unknown'}><td>{u.university_id?<Link href={labDashboardHref(range,source,{university:u.university_id})}>{u.university??u.university_id}</Link>:'대학 확인 불가'}</td>{[u.requests,u.students,u.completed,u.failed,u.free_revisions,u.beta_requests].map((n,i)=><td key={i}>{number(n)}</td>)}</tr>)}</tbody></table></div>:<p>조건에 맞는 대학 이용 기록이 없습니다.</p>}</>}</DashboardResult></FocusSection>
 <FocusSection title="학생 피드백" href="/admin/essay-feedback/"><p className="focus-note">기간·출처 무관 · 현재 접수 상태. 만족도 평균은 점수 계약이 없어 표시하지 않습니다.</p><div className="lab-secondary-grid"><DashboardResult read={feedback} onRetry={()=>setFeedbackRefresh(n=>n+1)}>{f=><KpiTile label="신규 피드백" value={number(f.stats.pending,'건')} href="/admin/essay-feedback/?status=new"/>}</DashboardResult><DashboardResult read={reviewing} onRetry={()=>setFeedbackRefresh(n=>n+1)}>{f=><KpiTile label="확인 중 피드백" value={number(f.stats.pending,'건')} href="/admin/essay-feedback/?status=reviewing"/>}</DashboardResult></div></FocusSection>
 <LabDashboardQuality range={range} refresh={refresh}/>
 {!secondary?<section className="focus-section"><div className="focus-body"><h2>이용권·매출·비용</h2><p>선택 기간의 기존 원장·결제·비용 요약을 조회합니다.</p><button onClick={()=>setSecondary(true)}>이용권·매출·비용 불러오기</button></div></section>:<LabDashboardFinance range={range} ops={ops} refresh={refresh} onOpsRetry={()=>setOpsRefresh(n=>n+1)}/>}
 </div>;
}
