"use client";
import {useState} from 'react';
import {useAuth} from '../auth-context';

const OWNER = 'd5eab102-da92-4c4c-9adb-16d2c9d20e4c';
const codes = new Set(['PT404','PGRST301','PGRST302','PGRST303','42501','UNAUTHORIZED_KEY','INVALID_API_KEY','API_KEY_ACCESS_DENIED','NOT_FOUND_PAYMENT','UNCLASSIFIED','UNAVAILABLE']);
function probe(value: unknown): string {
  if (!value || typeof value !== 'object') return '확인 불가';
  const p = value as Record<string, unknown>;
  const status = Number.isInteger(p.status) && Number(p.status)>=0 && Number(p.status)<=599 ? String(p.status) : '미확인';
  return `HTTP ${status} · ${codes.has(String(p.code)) ? String(p.code) : 'UNCLASSIFIED'}`;
}
export function PaymentReadDiagnostics({paused}:{paused:boolean}) {
  const {client,user}=useAuth();
  const [busy,setBusy]=useState(false);
  const [report,setReport]=useState<{owner:string;text:string}|null>(null);
  if(user?.id!==OWNER || !paused) return null;
  async function run() {
    if(busy || !client) return;
    setBusy(true);setReport(null);
    try {
      const session=(await client.auth.getSession()).data.session;
      if(session?.user.id!==OWNER) throw Error('auth');
      const response=await fetch('/api/payments/diagnostics',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:'{}',cache:'no-store'});
      if(!response.ok) throw Error('unavailable');
      const data=await response.json();
      setReport({owner:OWNER,text:`Finance: ${probe(data.finance)} · 읽기 권한 ${data.finance_read_authorized===true?'확인':'미확인'} / Toss: ${probe(data.provider)} · MID ${data.provider?.mid_matches===true?'일치':'미확인'} / Client·Secret 쌍: 미확인`});
    } catch { setReport({owner:OWNER,text:'진단을 완료하지 못했습니다. 권한 또는 서버 상태를 확인해 주세요.'}); }
    finally {setBusy(false);}
  }
  return <section className="admin-section" aria-label="결제 읽기 진단"><h2>PAUSED 서버 읽기 진단</h2><p>기존 주문 조회만 수행합니다. 결제 승인·환불·활성화는 실행하지 않습니다.</p><button type="button" disabled={busy} onClick={()=>void run()}>{busy?'진단 중':'읽기 진단 실행'}</button>{report?.owner===user.id&&<p role="status">{report.text}</p>}</section>;
}
