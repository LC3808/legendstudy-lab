"use client";
import {useEffect,useMemo,useState} from 'react';
import {useReadReport} from './admin-dashboard-view';
import {KpiTile} from './kpi-tile';
import {AdminRecoveryOperations} from './admin-recovery-operations';
import {AdminPeriodFilter} from './admin-period-filter';
import type {AdminPeriod} from '@/lib/admin/period';
import {formatDateTime} from '@/lib/admin/format';
import {labDashboardHref} from '@/lib/admin/lab-dashboard';
import {analyticsWindow} from '@/lib/admin/analytics';
export type LabStatusReport={summary?:{requests?:number;completed?:number;failed?:number;retries?:number|null};live?:{processing?:number;retry_pending?:number;archived?:number}};
type Read<T>={data?:T;error?:boolean;receivedAt?:string};
type Range={p_from:string|null;p_to:string|null};
const known=(n:unknown):n is number=>typeof n==='number'&&Number.isInteger(n)&&n>=0;
export function AdminLabWarningStrip(){
 const [refresh,setRefresh]=useState(0),[period,setPeriod]=useState<AdminPeriod>('d7'),[from,setFrom]=useState(''),[to,setTo]=useState('');
 useEffect(()=>{const update=()=>setRefresh(n=>n+1);window.addEventListener('admin-lab-changed',update);return()=>window.removeEventListener('admin-lab-changed',update);},[]);
 const range=useMemo(()=>{void refresh;return analyticsWindow(period,from,to);},[refresh,period,from,to]);
 const valid=range&&Date.parse(range.p_to)-Date.parse(range.p_from)<=93*86400000?range:null;
 const liveRange=useMemo(()=>{void refresh;return analyticsWindow('today')!;},[refresh]);
 const live=useReadReport<LabStatusReport>('admin_essay_operations',{...liveRange,p_filters:{},p_offset:0,p_run:null},refresh);
 const feedback=useReadReport<{stats?:{pending?:number}}>('admin_essay_feedback',{p:{}},refresh);
 return <><AdminPeriodFilter label="논술 운영 기간 (KST)" period={period} from={from} to={to} options={['today','d7','d30','custom']} onChange={(p,f,t)=>{setPeriod(p);setFrom(f);setTo(t);}}/>{!valid&&<p role="alert">시작일과 종료일을 입력하고 93일 이내로 선택하세요.</p>}<LabStatusCards range={valid} report={live} feedback={feedback} refresh={refresh} onRefresh={()=>setRefresh(n=>n+1)} hubLink/></>;
}
export function LabStatusCards({report,feedback,onRefresh,hubLink=false,range,refresh=0}:{range:Range|null;report:Read<LabStatusReport>;feedback:Read<{stats?:{pending?:number}}>;refresh?:number;onRefresh:()=>void;hubLink?:boolean}){
 const stats=useReadReport<{version:string;as_of:string;summary:NonNullable<LabStatusReport['summary']>}>('admin_lab_operation_stats',range,refresh);
 const values=stats.data?.version==='admin-lab-operation-stats-v1'?stats.data.summary:undefined;
 const periodNote=range?.p_from&&range.p_to?`${formatDateTime(range.p_from)} ~ ${formatDateTime(new Date(Date.parse(range.p_to)-1).toISOString())} · KST`:'전체 기간';
 const periodItems=[['첨삭 요청',values?.requests,'','선택 기간에 생성된 요청'],['첨삭 완료',values?.completed,'completed','선택 기간 접수 중 현재 완료'],['첨삭 실패',values?.failed,'failed','선택 기간 접수 중 현재 실패'],['재시도 발생',values?.retries,'','선택 기간에 기록된 재시도 사건']] as const;
 const stamp=(r:Read<unknown>)=>r.receivedAt?formatDateTime(r.receivedAt)+' KST':'확인 중';
 const items=[
  {name:'현재 처리 중',n:report.data?.live?.processing,href:'/admin/essay-runs/?state=reserved&visibility=visible',scope:'전체 기간 · 현재 예약 상태 · 보관 요청 제외',source:report},
  {name:'현재 재시도 대기',n:report.data?.live?.retry_pending,href:'/admin/essay-runs/?state=reserved&visibility=visible',scope:'전체 기간 · 예약 중 문항 실패 기록 보유 · 보관 요청 제외',source:report},
  {name:'미처리 학생 피드백',n:feedback.data?.stats?.pending,href:'/admin/essay-feedback/',scope:'전체 기간 · 신규 및 확인 중',source:feedback},
  {name:'보관된 요청',n:report.data?.live?.archived,href:'/admin/essay-runs/?visibility=hidden',scope:'전체 기간 · 모든 상태의 보관 요청 · 활성 집계 제외',source:report},
 ];
 return <><section className="admin-panel lab-status" aria-label="논술 LAB 운영 확인">
 <header className="focus-toolbar"><h2>논술 LAB 운영 확인</h2><button type="button" onClick={onRefresh}>운영 상태 새로고침</button></header>
 <h3>기간별 통계</h3><p className="focus-note">{periodNote} · 전체 출처 · 보관 요청 포함. 완료·실패는 접수 기간에 속한 요청의 현재 상태입니다. 재시도는 실제 발생 기간으로 집계합니다.</p>
 {stats.error&&<p role="alert">기간별 지표 조회 실패 · 관리자 권한 또는 통계 DB 적용 상태를 확인하세요.</p>}
 <div className="lab-status-grid">{periodItems.map(([name,n,state,note])=><KpiTile key={name} label={name} value={!range?'기간 선택 필요':stats.error?'확인 불가':!stats.data?'조회 중…':known(n)?`${n}건`:'확인 불가'} href={name==='재시도 발생'?'/admin/operations/':range?labDashboardHref(range,'',state?{state}:{}):'/admin/essay-runs/'} note={<>{periodNote}<br/>{note}<br/>갱신 {stats.data?.as_of?formatDateTime(stats.data.as_of)+' KST':stamp(stats)}{name==='재시도 발생'&&<><br/>운영 상세 · 재시도 사건 필터 미적용</>}</>}/>)}</div>
 <h3>현재 운영 상태 · 전체 기간</h3>
 {(report.error||feedback.error)&&<p role="alert">일부 현재 운영 지표 조회 실패 · 확인 불가</p>}
 <div className="lab-status-grid">{items.map(i=><KpiTile key={i.name} label={i.name} value={i.source.error?'확인 불가':!i.source.data?'조회 중…':known(i.n)?`${i.n}건`:'확인 불가'} href={i.href} tone="info" note={<>{i.scope}<br/>갱신 {stamp(i.source)}{i.name==='현재 재시도 대기'&&<><br/>예약 목록 · 재시도 가능 여부는 상태 확인</>}</>}/>)}</div>
 <p className="focus-note">현재 상태는 기간 선택과 무관합니다. 처리 중은 예약을 유지한 미완료 요청 수이며 지금 실행 중이라는 뜻은 아닙니다. 응답 확인이 필요한 요청도 포함됩니다. 첨삭 실패 0건이어도 미완료 요청의 정상 처리를 뜻하지 않습니다. 처리 중·재시도 대기는 중복될 수 있으며 합산하지 않습니다. 실행 잠금·문항 기록을 확인하기 전에는 중단으로 판정하지 않습니다. 보관 요청은 활성 집계에서 제외하며 별도로 표시합니다. 보관해도 이용권 예약은 유지됩니다.</p>
 {hubLink&&<p><a href="/admin/lab-dashboard/">논술 LAB 대시보드로 →</a></p>}
 </section><AdminRecoveryOperations range={range} refresh={refresh}/></>;
}
