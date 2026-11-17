"use client";
import {useState} from 'react';
import {useAuth} from '../auth-context';
const OWNER='d5eab102-da92-4c4c-9adb-16d2c9d20e4c';
const date=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>0?new Date(n*1000).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'기록 없음';
export function FinanceAuthStatus(){
 const {client,user}=useAuth();const [busy,setBusy]=useState(false);const [report,setReport]=useState<{owner:string;warning:boolean;text:string}|null>(null);
 if(user?.id!==OWNER)return null;
 async function check(){
  if(busy||!client)return;setBusy(true);
  try{
   const session=(await client.auth.getSession()).data.session;if(session?.user.id!==OWNER)throw Error();
   const r=await fetch('/api/payments/finance-auth-status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:'{}',cache:'no-store'});if(!r.ok)throw Error();
   const d=await r.json();const hours=typeof d.remainingSeconds==='number'&&Number.isFinite(d.remainingSeconds)?Math.max(0,Math.floor(d.remainingSeconds/3600)):0;
   const source=d.source==='shadow'?'검증 모드 (결제는 기존 인증)':d.source==='automatic'?'자동 갱신':d.source==='fallback'?'기존 토큰으로 복구':'수동 갱신';
   setReport({owner:OWNER,warning:d.warning!==false,text:`${source} · 인증 ${d.healthy===true?'유효':'확인 필요'} · 만료까지 ${hours}시간 / 만료: ${date(d.expiresAt)} / 마지막 갱신 성공: ${date(d.lastSuccess)} / 마지막 실패: ${date(d.lastFailure)} / 다음 재시도: ${date(d.retryAt)}${d.lastError?' / 인증 오류 기록 있음':''}`});
  }catch{setReport({owner:OWNER,warning:true,text:'Finance 인증 상태를 확인하지 못했습니다. 운영 로그와 수동 복구 절차를 확인해 주세요.'});}finally{setBusy(false);}
 }
 return <section className="admin-section" aria-label="Finance 인증 상태"><h2>Finance 인증 상태</h2><p>서버 내부 인증의 만료·갱신 상태입니다. 결제나 환불을 실행하지 않습니다.</p><button type="button" disabled={busy} onClick={()=>void check()}>{busy?'확인 중':'인증 상태 확인'}</button>{report?.owner===user.id&&<p role={report.warning?'alert':'status'}>{report.warning?'운영 확인 필요: ':''}{report.text}</p>}</section>;
}
