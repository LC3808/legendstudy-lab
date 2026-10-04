'use client';
import {useState} from 'react';
import {getBrowserAuthClient} from '@/lib/browser-auth-client';
export default function SupportPayment(){
 const [id,setId]=useState('');const [output,setOutput]=useState('');const [busy,setBusy]=useState(false);
 async function run(action:string){setBusy(true);try{
  const session=await getBrowserAuthClient()?.auth.getSession();if(!session?.data.session)throw new Error('지원 계정으로 로그인해 주세요.');
  const slot=`support-${action}-${id}`;let key=sessionStorage.getItem(slot);if(!key){key=crypto.randomUUID();sessionStorage.setItem(slot,key);}
  const r=await fetch(`/api/payments/support-${action}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.data.session.access_token}`},body:JSON.stringify({id,request_key:key})});
  if(!r.ok)throw new Error('권한 또는 처리 상태를 확인해 주세요. 불확실한 결과는 재조회·복구해 주세요.');
  const data=await r.json();setOutput(JSON.stringify(data,null,2));
 }catch(e){setOutput(e instanceof Error?e.message:'처리 상태를 확인해 주세요.');}finally{setBusy(false);}}
 return <section className="content-wrap"><h1>고객지원 결제 처리</h1><label>주문 UUID<input disabled={busy} value={id} onChange={e=>{setId(e.target.value);setOutput('');}} /></label><button disabled={busy} onClick={()=>void run('inspect')}>소유자·사용량·환불액 조회</button><button disabled={busy||!output.includes('"eligible": true')} onClick={()=>{if(window.confirm('조회한 소유자와 환불액을 확인했습니까?'))void run('cancel');}}>일반 환불 실행</button><button disabled={busy} onClick={()=>void run('reconcile')}>기존 거래 복구</button><pre>{output}</pre></section>;
}
