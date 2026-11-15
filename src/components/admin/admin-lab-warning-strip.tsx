'use client';
import {useMemo,useState} from 'react';
import {useReadReport} from './admin-dashboard-view';
import {KpiTile} from './kpi-tile';
import {analyticsWindow} from '@/lib/admin/analytics';
type Report={summary?:{failed?:number};live?:{processing?:number;retry_pending?:number}};
const known=(n:unknown):n is number=>typeof n==='number'&&Number.isInteger(n)&&n>=0;
export function AdminLabWarningStrip(){
 const [refresh,setRefresh]=useState(0);
 const range=useMemo(()=>{void refresh;return analyticsWindow('d7');},[refresh]);
 const r=useReadReport<Report>('admin_essay_operations',range?{...range,p_filters:{},p_offset:0,p_run:null}:null,refresh);
 const feedback=useReadReport<{stats?:{pending?:number}}>('admin_essay_feedback',{p:{status:'new'}},refresh);
 const items=[
  {name:'최근 7일 첨삭 실패',n:r.data?.summary?.failed,period:'최근 7일 접수 기준 · KST',href:'/admin/essay-runs/?state=failed',destination:'전체 기간 실패 회차 목록',source:r},
  {name:'현재 처리 중',n:r.data?.live?.processing,period:'전체 기간 · 현재 상태',href:'/admin/essay-runs/?state=reserved',destination:'미완료 회차 목록',source:r},
  {name:'현재 재시도 대기',n:r.data?.live?.retry_pending,period:'전체 기간 · 현재 상태',href:'/admin/operations/',destination:'운영 상세 · 재시도 필터 미적용',source:r},
  {name:'신규 학생 피드백',n:feedback.data?.stats?.pending,period:'전체 기간 · 신규 상태',href:'/admin/essay-feedback/?status=new',destination:'신규 피드백 목록',source:feedback},
 ];
 const allZero=items.every(i=>!i.source.error&&i.source.data&&known(i.n)&&i.n===0);
 const cards=<div className="lab-status-grid">{items.map(i=>{
  const available=!i.source.error&&!!i.source.data&&known(i.n);
  const value=available?`${i.n}건`:i.source.error?'확인 불가':!i.source.data?'조회 중…':'확인 불가';
  return <KpiTile key={i.name} label={i.name} value={value} href={i.href} tone="info" note={<>{i.period}<br/><strong>{available?(i.n===0?'해당 항목 없음':'내역 확인 가능'):'집계 확인 필요'}</strong><br/>{i.destination}</>}/>;
 })}</div>;
 return <section className="admin-panel lab-status" aria-label="논술 LAB 운영 확인">
 <header className="focus-toolbar"><h2>논술 LAB 운영 확인</h2><button type="button" onClick={()=>setRefresh(n=>n+1)}>운영 상태 새로고침</button></header>
 {r.error||feedback.error?<p role="alert">일부 운영 지표 조회 실패 · 확인 불가</p>:null}
 {allZero?<details><summary>현재 표시 중인 운영 지표에서 추가 확인 항목이 없습니다. · 4개 지표 보기</summary>{cards}</details>:cards}
 <p className="focus-note">처리 중·재시도 대기는 중복될 수 있으며 합산하지 않습니다. 건수만으로 장애를 판정하지 않습니다. 실패·처리 중 링크는 회차 목록으로 이동하며 운영 집계와 범위가 다를 수 있습니다.</p>
 <details><summary>집계 범위와 미확인 항목</summary><p className="focus-note">실패는 최근 7일 접수 중 현재 실패 상태입니다. 처리 중은 예약 상태, 재시도 대기는 그중 문항 실패 기록이 있는 항목입니다. 신규 피드백은 신규 상태만 집계합니다. 장기 미완료·결과 누락·차감 이상은 이 집계로 확인할 수 없습니다.</p></details>
 </section>;
}
