'use client';
import {useState} from 'react';
import {useReadReport} from './admin-dashboard-view';
import {analyticsWindow} from '@/lib/admin/analytics';
type Report={summary?:{failed?:number};live?:{processing?:number;retry_pending?:number}};
export function AdminLabWarningStrip(){
 const [range]=useState(()=>analyticsWindow('d7'));
 const [refresh,setRefresh]=useState(0);
 const r=useReadReport<Report>('admin_essay_operations',range?{...range,p_filters:{},p_offset:0,p_run:null}:null,refresh);
 const feedback=useReadReport<{stats?:{pending?:number}}>('admin_essay_feedback',{p:{status:'new'}},refresh);
 const count=(n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=0?`${n}건`:'확인 불가';
 return <section className="admin-panel" aria-label="논술 LAB 운영 확인"><h2>논술 LAB 운영 확인</h2>
 <p>실패는 최근 7일 접수 기준 · 처리 중·재시도 대기는 전체 현재 상태입니다. 대기 건수만으로 장애를 판정하지 않습니다.</p>
 {r.error?<p role="alert">운영 상태 조회 실패 · 확인 불가</p>:!r.data?<p role="status">운영 상태 조회 중…</p>:<ul>
 <li><a href="/admin/essay-runs/?state=failed">최근 7일 접수 중 실패 {count(r.data.summary?.failed)} · 전체 실패 내역</a></li>
 <li><a href="/admin/essay-runs/?state=reserved">현재 처리 중 {count(r.data.live?.processing)} · 미완료 내역</a></li>
 <li><a href="/admin/operations/">현재 재시도 대기 {count(r.data.live?.retry_pending)} · 운영 현황</a></li>
 </ul>}
 <p><a href="/admin/essay-feedback/?status=new">전체 기간 신규 학생 피드백 {feedback.error?'확인 불가':!feedback.data?'조회 중…':count(feedback.data.stats?.pending)}</a></p>
 <button onClick={()=>setRefresh(n=>n+1)}>운영 상태 새로고침</button>
 <p>장시간 미완료 기준·결과 누락·차감 이상의 통합 경고 집계는 확인 불가입니다. 개별 첨삭 상세에서 저장 결과와 거래 기록을 확인하세요.</p>
 </section>;
}
