"use client";
import {collectionReadiness, ga4Config} from "@/lib/analytics/ga4";
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '@/components/auth-context';
import {Ga4Report} from './ga4-report';
import {AdminPanel} from './admin-surface';
import {describeError} from '@/lib/admin/errors';
import {analyticsWindow,parseAnalytics,reports,type ReportKind,type AnalyticsReport} from '@/lib/admin/analytics';
import type {AdminPeriod} from '@/lib/admin/period';
import './admin-analytics.css';

type Result={key:string;report?:AnalyticsReport;error?:string};
function Report({kind,window}:{kind:ReportKind;window:{p_from:string;p_to:string}}){
 const {client,user}=useAuth();const key=JSON.stringify([user?.id,window,kind]);const [result,setResult]=useState<Result|null>(null);
 useEffect(()=>{let alive=true;if(!client)return;void(async()=>{try{const {data,error}=await client.rpc(reports[kind][0],window);if(error)throw error;const report=parseAnalytics(kind,data);if(alive)setResult({key,report});}catch(error){if(alive)setResult({key,error:describeError(error)});}})();return()=>{alive=false;};},[client,key,kind,window]);
 const current=result?.key===key?result:null;
 return <AdminPanel title={{satisfaction:'사용자 만족도',kpi:'학습·가입 개요',funnel:'가입 코호트 학습 흐름',revenue:'유료 전환·매출',cost:'평가 API 비용·일별 추이',university:'대학별 첨삭 이용'}[kind]}>
 {!current?<p role="status">집계 조회 중…</p>:current.error?<p role="alert">{current.error}</p>:current.report?<><p>{current.report.note}</p><dl className="analytics-metrics">{current.report.metrics.map(metric=><div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value===null?'데이터 없음':metric.value.toLocaleString('ko-KR')+ (metric.unit?' '+metric.unit:'')}</dd></div>)}</dl>{current.report.rows&&<div className="analytics-table"><table><caption>{current.report.rows.length?'조회 기간 상세 집계':'데이터 없음'}</caption><thead><tr>{current.report.columns?.map(column=><th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{current.report.rows.map((row,index)=><tr key={index}><th scope="row">{row.label}</th>{row.values.map((value,i)=><td key={i}>{value===null?'UNKNOWN':value.toLocaleString('ko-KR',{maximumFractionDigits:6})}</td>)}</tr>)}</tbody></table></div>}</>:null}
 </AdminPanel>;
}
const links=[['베타 운영 현황','/admin/beta/'],['참여 사용자·이용 현황','/admin/beta/usage/'],['평가 실패·복구','/admin/beta/failures/'],['평가·비용 모니터링','/admin/operations/'],['첨삭 품질 검수','/ql/'],['실제 답안·재첨삭 비교 검수','/owner-review/essay/'],['만족도·피드백·오류 신고','/admin/essay-feedback/']] as const;
export function AdminAnalytics({focus='all'}:{focus?:'all'|'ga4'|'conversion'|'essay'}={}){
 const [period,setPeriod]=useState<AdminPeriod>('d7');const [from,setFrom]=useState('');const [to,setTo]=useState('');
 const [now,setNow]=useState(()=>new Date());
 const window=useMemo(()=>analyticsWindow(period,from,to,now),[period,from,to,now]);
 return <div className="analytics-dashboard">
 <form className="analytics-filter" onSubmit={e=>{e.preventDefault();setNow(new Date());}}><label>집계 기간 (KST)<select value={period} onChange={e=>setPeriod(e.target.value as AdminPeriod)}><option value="today">오늘</option><option value="d7">최근 7일</option><option value="d30">최근 30일</option><option value="custom">사용자 지정</option></select></label>{period==='custom'?<><label>시작일<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>종료일<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></>:null}<button type="submit">새로고침</button></form>
 {!window?<p role="alert">400일 이내의 올바른 기간을 선택해 주세요.</p>:window?<>{((focus==='ga4'?[]:focus==='conversion'?['kpi','funnel','revenue']:focus==='essay'?['university','cost']:['kpi','funnel','revenue','cost','university',...(process.env.NEXT_PUBLIC_ESSAY_SATISFACTION_V2_ENABLED==='true'?['satisfaction']:[])]) as ReportKind[]).map(kind=><Report key={kind+now.toISOString()} kind={kind} window={window}/>)}</>:null}
 {window&&<Ga4Report window={window} refresh={now.toISOString()}/>}
 <AdminPanel title="방문·유입·참여 분석" tone="warning"><p>수집 설정과 보고서 읽기 연결은 별개입니다. 기존 사이트의 실제 조회 결과는 위 GA4 보고서에서 확인합니다. LAB 미연결 지표를 서버 학습 기록으로 대체하지 않습니다.</p><dl><dt>레전드스터디닷컴</dt><dd>속성 396674471 · 위 보고서의 조회 상태 참조</dd><dt>LAB 이벤트 수집 설정</dt><dd>{collectionReadiness(ga4Config)}</dd><dt>레전드스터디 LAB</dt><dd>전용 GA4 속성 확인 필요 · 보고서 미연결</dd></dl><p>두 속성은 별도로 집계합니다. 서비스 간 사용자 연결이 검증되기 전에는 방문자 합계나 교차 서비스 전환율을 계산하지 않습니다.</p><ul>{['LAB 방문·유입·페이지뷰','실시간·기기·지역','교차 서비스 가입·구매 전환','D1·D7·D30 유지율'].map(label=><li key={label}>{label} — 미연결</li>)}</ul><p>스토어 이동 클릭과 설치 완료는 별개입니다. 설치 완료: NOT_AVAILABLE.</p></AdminPanel>
 <AdminPanel title="베타·품질·만족도 상세 분석"><nav className="analytics-links" aria-label="분석 상세 페이지">{links.map(([label,href])=><Link key={href} href={href}>{label} →</Link>)}</nav><p>기존 운영·검수 원장을 그대로 조회합니다. 1~5점 만족도는 별도 SQL 승인·설치 후 기능 플래그로 활성화합니다. 기존 품질 검수와 신규 6개 수치 기준의 호환성은 추가 검증 대상입니다.</p></AdminPanel>
 </div>;
}
