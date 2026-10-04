'use client';
import { useEffect, useState } from 'react';
import { getBrowserAuthClient } from '@/lib/browser-auth-client';
export type CreditSummary = {dto_version:string;spendable:number;paid:number;free:number;other:number;next_expiry:string|null};
export function validCredit(v: CreditSummary) {return v.dto_version==='credit-v1' && [v.spendable,v.paid,v.free,v.other].every(n=>Number.isSafeInteger(n)&&n>=0) && v.spendable===v.paid+v.free+v.other;}
export function CreditBalance() {
  const [balance,setBalance]=useState<CreditSummary|null>(null); const [error,setError]=useState(false);const [version,setVersion]=useState(0);
  useEffect(()=>{let active=true;const client=getBrowserAuthClient();
    async function load(){ const session=await client?.auth.getSession(); const owner=session?.data.session?.user.id;
      if(!owner){if(active)setBalance(null);return;}
      const r=await client!.rpc('credit_summary');const current=await client!.auth.getSession();
      if(!active||current.data.session?.user.id!==owner)return;
      if(r.error||!r.data||!validCredit(r.data)){setError(true);setBalance(null);}else{setBalance(r.data);setError(false);}}
    void load();const subscription=client?.auth.onAuthStateChange((event)=>{if(event==='INITIAL_SESSION')return;setBalance(null);setVersion(v=>v+1);});
    return()=>{active=false;subscription?.data.subscription.unsubscribe();};},[version]);
  return <section><h2>내 Credit</h2>{balance&&<p>사용 가능 {balance.spendable} Credits · 구매 {balance.paid} · 가입 무료 {balance.free} · 기타 {balance.other}{balance.next_expiry&&<> · 가장 가까운 만료: {new Date(balance.next_expiry).toLocaleString('ko-KR')}</>}</p>}{error&&<p>Credit을 확인하지 못했습니다.</p>}<button onClick={()=>setVersion(v=>v+1)}>잔액 새로고침</button></section>;
}
