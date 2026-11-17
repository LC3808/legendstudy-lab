"use client";
import {useRef,useState} from 'react';
import {useAuth} from '../auth-context';
const OWNER='d5eab102-da92-4c4c-9adb-16d2c9d20e4c';
type Preview={id:string;owner:string;amount:number;quantity:number;mode:string;eligible:boolean;state:string};
export function PaymentRefundControl(){
 const {client,user}=useAuth();
 const [input,setInput]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false),operation=useRef<{id:string;key:string}|null>(null);
 if(user?.id!==OWNER)return null;
 async function request(action:string,id:string,key:string){
  const session=(await client?.auth.getSession())?.data.session;
  if(session?.user.id!==OWNER)throw Error('AUTH_REQUIRED');
  const r=await fetch('/api/payments/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({id,request_key:key}),cache:'no-store'});
  if(!r.ok)throw Error('REQUEST_FAILED');return r.json();
 }
 async function inspect(){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('');setPreview(null);
  try{
   const id=input.trim();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('ID');
   const data=await request('support-inspect',id,crypto.randomUUID());
   const p=data.preview,o=data.order;
   if(o?.id!==id||!Number.isSafeInteger(p?.refund_amount)||p.refund_amount<0||!Number.isSafeInteger(p.remaining)||p.remaining<0||!['TEST','LIVE'].includes(o.mode))throw Error('INVALID');
   setPreview({id,owner:OWNER,amount:p.refund_amount,quantity:p.remaining,mode:o.mode,eligible:p.eligible===true,state:o.state});
  }catch{setMessage('환불 대상을 확인하지 못했습니다. 주문번호와 운영 권한을 확인해 주세요.');}
  finally{lock.current=false;setBusy(false);}
 }
 async function cancel(){
  if(lock.current||!preview?.eligible||preview.owner!==user?.id)return;
  if(!window.confirm(`${preview.mode==='LIVE'?'실제 결제':'TEST 결제'} ${preview.amount.toLocaleString()}원을 환불하고 이용권 ${preview.quantity}회를 회수하시겠습니까?`))return;
  lock.current=true;setBusy(true);setMessage('');
  const current=preview;
  if(operation.current?.id!==current.id)operation.current={id:current.id,key:crypto.randomUUID()};
  try{
   const data=await request('support-cancel',current.id,operation.current.key);
   if(!['CANCELLED','PARTIALLY_CANCELLED'].includes(data.order?.state)||data.order?.grant_state!=='REVOKED')throw Error('PENDING');
   setPreview(null);setMessage('환불 처리와 이용권 회수가 완료됐습니다. 결제 내역을 새로고침해 주세요.');
  }catch{setMessage('환불 결과 확인이 필요합니다. 새 환불을 반복하지 말고 주문 상태를 확인해 주세요.');setPreview(null);}
  finally{lock.current=false;setBusy(false);}
 }
 return <section className="admin-section" aria-label="Owner 환불 처리"><h2>결제 취소·환불</h2><p>서버가 미사용 이용권과 환불 가능 금액을 확인합니다. 실제 환불과 이용권 회수가 함께 처리됩니다.</p><label htmlFor="refund-order">환불할 주문 ID</label><input id="refund-order" value={input} disabled={busy} onChange={e=>{setInput(e.target.value);setPreview(null);setMessage('');}}/><button type="button" disabled={busy} onClick={()=>void inspect()}>환불 대상 확인</button>{preview?.owner===user.id&&<div><p>{preview.mode} · 주문 {preview.id}</p><p>환불 금액 {preview.amount.toLocaleString()}원 · 회수 이용권 {preview.quantity}회</p><button type="button" disabled={busy||!preview.eligible} onClick={()=>void cancel()}>환불 실행</button>{!preview.eligible&&<p>현재 환불할 수 없는 주문입니다.</p>}</div>}{message&&<p role="status">{message}</p>}</section>;
}
