'use client';
import {useRef, useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {requestCreditGrant, type CreditGrantInput} from '@/lib/admin/finance-boundary';

export function AdminCreditGrantForm({accountId,email,onGranted}:{accountId:string;email:string|null;onGranted:()=>void}) {
 const {client,user,status}=useAuth();
 return <GrantForm key={`${user?.id}:${accountId}`} accountId={accountId} email={email}
  client={status==='authenticated'?client:null} actor={user?.id??''} onGranted={onGranted}/>;
}
function GrantForm({accountId,email,client,actor,onGranted}:{accountId:string;email:string|null;client:ReturnType<typeof useAuth>['client'];actor:string;onGranted:()=>void}) {
 const [quantity,setQuantity]=useState(1);const [reason,setReason]=useState('');
 const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
 const [pending,setPending]=useState<CreditGrantInput|null>(null);
 const lock=useRef(false);const dialog=useRef<HTMLDialogElement>(null);const trigger=useRef<HTMLButtonElement>(null);
 const storageKey=`legendstudy-admin-grant:${actor}:${accountId}`;
 function open() {
  if(!client||!email)return;
  try {
   const saved=sessionStorage.getItem(storageKey);
   if(saved){const p=JSON.parse(saved) as CreditGrantInput;
    if(p.accountId!==accountId||typeof p.requestKey!=='string'||!Number.isInteger(p.quantity)||typeof p.reason!=='string')throw Error();
    setPending(p);setQuantity(p.quantity);setReason(p.reason);
    setNotice('이전 요청의 결과를 확인합니다. 같은 요청으로 재시도해도 중복 지급되지 않습니다.');
   } else {setPending(null);setNotice('');}
   dialog.current?.showModal();
  }catch{setNotice('이전 지급 요청을 확인하지 못했습니다. 새 지급을 중단했습니다.');}
 }
 async function grant(){
  if(lock.current||!client||!email||!actor)return;
  if(!Number.isInteger(quantity)||quantity<1||quantity>100||!reason.trim()||reason.trim().length>500){setNotice('수량 1~100과 지급 사유를 입력하세요.');return;}
  lock.current=true;setBusy(true);
  try {
   const input=pending??{accountId,email,quantity,reason:reason.trim(),requestKey:crypto.randomUUID()};
   // Persist BEFORE sending. A reload or lost response must retry the same key.
   sessionStorage.setItem(storageKey,JSON.stringify(input));setPending(input);
   await requestCreditGrant(client,input);
   sessionStorage.removeItem(storageKey);setPending(null);setQuantity(1);setReason('');
   setNotice(`${input.quantity} Credit을 지급했습니다.`);dialog.current?.close();onGranted();
  }catch{setNotice('지급 완료를 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요. 대상 정보가 변경됐다면 운영 확인이 필요합니다.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <div className="admin-panel">
  <button ref={trigger} type="button" className="button button--outline button--small" disabled={!email||!client} onClick={open}>Credit 지급</button>
  {notice?<p role="status" className="admin-hint">{notice}</p>:null}
  <dialog ref={dialog} className="my-lab-dialog" aria-labelledby="credit-grant-title" onCancel={event=>{if(lock.current)event.preventDefault();}} onClose={()=>trigger.current?.focus()}>
   <h3 id="credit-grant-title">Credit 지급 확인</h3>
   <p>대상 이메일: {pending?.email??email}</p><p style={{overflowWrap:'anywhere'}}>회원 UID: {accountId}</p>
   <p className="admin-muted">운영 지급 · 만료 없음 · 유료 구매 Credit과 별도 기록</p>
   <form className="admin-stack" onSubmit={event=>{event.preventDefault();void grant();}}>
    <label htmlFor="grant-quantity">지급 수량 (1~100)</label>
    <input className="admin-search__input" id="grant-quantity" type="number" min={1} max={100} required value={quantity} disabled={busy||!!pending} onChange={e=>setQuantity(Number(e.target.value))}/>
    <label htmlFor="grant-reason">지급 사유</label>
    <textarea className="admin-search__input" id="grant-reason" required maxLength={500} rows={3} value={reason} disabled={busy||!!pending} onChange={e=>setReason(e.target.value)}/>
    <p>위 회원에게 {quantity} Credit을 지급합니다. 대상과 사유를 확인하세요.</p>
    {notice?<p role="status">{notice}</p>:null}
    <div className="admin-search__row"><button type="button" className="button button--outline" disabled={busy} onClick={()=>dialog.current?.close()}>닫기</button>
    <button type="submit" className="button button--primary" disabled={busy||!reason.trim()||quantity<1||quantity>100}>{busy?'지급 중입니다':pending?'동일 요청 다시 확인':'확인 후 지급'}</button></div>
   </form>
  </dialog>
 </div>;
}
