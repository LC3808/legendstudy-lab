"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { paymentSessionToken } from '@/lib/payment-browser-session';
import { paymentState, type PaymentState } from '@/lib/payment-runtime';
import { pricingPlans } from '@/lib/pricing';

type Order = { mode?: 'TEST'|'LIVE'; id: string; order_id: string; state: string; amount: number; quantity: number; grant_state: string };
type Checkout = { clientKey: string; customerKey: string; orderId: string; orderName: string; amount: {currency: string; value: number}; successUrl: string; failUrl: string };
declare global { interface Window { TossPayments?: (key: string) => { payment: (options: {customerKey: string}) => {requestPayment: (options: Omit<Checkout,'clientKey'|'customerKey'> & {method: string}) => Promise<void>} }; } }
async function api(action: string, payload: object): Promise<{order: Order; checkout?: Checkout}> {
  const token = await paymentSessionToken();
  const r = await fetch(`/api/payments/${action}`, {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
  if (!r.ok) throw new Error(r.status === 401 ? `결제 서버에서 인증을 확인하지 못했습니다. (${action.toUpperCase()}_HTTP_401)` : `결제 확인이 필요합니다. 잠시 후 재확인해 주세요. (${action.toUpperCase()}_HTTP_${r.status})`);
  return r.json();
}
async function sdk() {
  if (window.TossPayments) return;
  await new Promise<void>((resolve,reject) => { const s=document.createElement('script'); s.src='https://js.tosspayments.com/v2/standard';s.onload=()=>resolve();s.onerror=()=>reject(new Error('결제창을 불러오지 못했습니다.'));document.head.appendChild(s); });
}
export function PaymentTest({callback=false,live=false}: {callback?:boolean;live?:boolean}) {
  const [message,setMessage]=useState(callback ? '결제 확인 중' : live ? '구매할 상품을 선택해 주세요.' : '실제 청구와 사용 가능한 Credit 지급이 없는 테스트입니다.');
  const [busy,setBusy]=useState(false);const [order,setOrder]=useState<Order|null>(null);
  const inFlight = useRef(false);
  const [runtime,setRuntime]=useState<PaymentState>('NOT_READY');
  useEffect(()=>{if(!callback)void paymentState().then(setRuntime);},[callback]);
  async function result() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);setMessage('결제 확인 중');
    try {
      const q=new URLSearchParams(window.location.search);const orderId=q.get('orderId');
      if (!orderId || !/^ls_[a-f0-9]{32}$/.test(orderId)) throw new Error('주문 정보를 확인할 수 없습니다.');
      const h=orderId.slice(3);const id=`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
      const status=await api('status',{id}); let current=status.order;
      if (current.state==='ORDER_CREATED') {
        const paymentKey=q.get('paymentKey');const amount=Number(q.get('amount'));
        if (!paymentKey || !Number.isSafeInteger(amount)) throw new Error('결제 정보를 확인할 수 없습니다.');
        // Order UUID is a deterministic operation-scoped key, not owner authority.
        current=(await api('confirm',{id,request_key:id,payment_key:paymentKey,amount})).order;
      } else if (['AUTHORIZATION_PENDING','CANCEL_PENDING'].includes(current.state)) current=(await api('reconcile',{id})).order;
      setOrder(current);setMessage(current.state==='PAID' ? (current.mode==='LIVE' ? '결제가 확인되어 Credit이 지급되었습니다.' : '테스트 결제 확인 완료. 사용 가능한 Credit은 지급되지 않습니다.') : '주문 상태를 확인했습니다.');
      // Keep only non-secret order identifier for reopening; provider key is no longer needed.
      window.history.replaceState(null,'',`?orderId=${encodeURIComponent(orderId)}`);
    } catch(e) { setMessage(e instanceof Error ? e.message : '재확인이 필요합니다.'); } finally {inFlight.current=false;setBusy(false);}
  }
  useEffect(()=>{if(callback) { const timer=setTimeout(()=>void result(),0);return ()=>clearTimeout(timer); }},[callback]);
  async function buy(quantity:number) {
    setBusy(true);
    try {
      const slot=`payment-${live ? 'live' : 'test'}-${quantity}`;let key=sessionStorage.getItem(slot);if(!key){key=crypto.randomUUID();sessionStorage.setItem(slot,key);}
      const r=await api('orders',{sku:`${quantity}c`,request_key:key});setOrder(r.order);
      if(!r.checkout) throw new Error('결제 준비 중입니다.');
      if(r.order.mode !== (live ? 'LIVE' : 'TEST')) throw new Error('결제 환경을 확인해 주세요.');
      await sdk();if(!window.TossPayments)throw new Error('결제창을 불러오지 못했습니다.');
      const {clientKey,customerKey,...payment}=r.checkout;
      try { await window.TossPayments(clientKey).payment({customerKey}).requestPayment({method:'CARD',...payment}); } catch { throw new Error('결제가 중단되었습니다. 다시 시도할 수 있습니다.'); }
    } catch(e){setMessage(e instanceof Error ? e.message : '결제 준비 중입니다.');}finally{setBusy(false);}
  }
  return <section className="policy-page content-wrap content-wrap--detail"><h1>{callback?'결제 확인':live?'Credit 구매':'결제 테스트 환경'}</h1><p role="status">{message}</p><Link href="/login/">로그인</Link>
    {callback ? <button disabled={busy} onClick={()=>void result()}>재확인</button> : pricingPlans.map(plan=><div key={plan.id}><h2>{plan.name} · {plan.priceLabel}</h2><button disabled={busy || runtime !== (live?'LIVE':'TEST')} onClick={()=>void buy(plan.credits)}>{live?'구매하기':'테스트 결제'}</button></div>)}
    {order && <p>주문 상태: {order.state}</p>}{!callback && <button disabled={busy} onClick={()=>{for(const p of pricingPlans) sessionStorage.removeItem(`payment-${live?'live':'test'}-${p.credits}`);setOrder(null);setMessage(live?'새 주문을 시작할 수 있습니다.':'새 테스트 주문을 시작할 수 있습니다.');}}>{live?'새 주문':'새 테스트 주문'}</button>}<p><Link href="/pricing/">요금 안내</Link> · <Link href="/support/">고객센터</Link></p></section>;
}
