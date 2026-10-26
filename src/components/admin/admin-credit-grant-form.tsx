'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {requestCreditGrant, creditOperationsReady, requestExpiringGrant, grantKinds, type GrantKind, type GrantValidity, type ExpiringGrantInput, type CreditGrantInput} from '@/lib/admin/finance-boundary';

export function AdminCreditGrantForm({accountId,email,onGranted}:{accountId:string;email:string|null;onGranted:()=>void}) {
 const {client,user,status}=useAuth();
 return <GrantForm key={`${user?.id}:${accountId}`} accountId={accountId} email={email}
  client={status==='authenticated'?client:null} actor={user?.id??''} onGranted={onGranted}/>;
}
function GrantForm({accountId,email,client,actor,onGranted}:{accountId:string;email:string|null;client:ReturnType<typeof useAuth>['client'];actor:string;onGranted:()=>void}) {
 const formId=useId();
 const [ready,setReady]=useState(false);
 useEffect(()=>{let active=true;if(client)void creditOperationsReady(client,accountId).then(v=>{if(active)setReady(v);}).catch(()=>{});return()=>{active=false;};},[client,accountId]);
 const [kind,setKind]=useState<GrantKind>('admin_grant');const [validity,setValidity]=useState<GrantValidity>('none');const [date,setDate]=useState('');
 const [quantity,setQuantity]=useState(1);const [reason,setReason]=useState('');
 const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
 const [pending,setPending]=useState<CreditGrantInput|ExpiringGrantInput|null>(null);
 const lock=useRef(false);const dialog=useRef<HTMLDialogElement>(null);const trigger=useRef<HTMLButtonElement>(null);
 const storageKey=`legendstudy-admin-grant:${actor}:${accountId}`;
 function open() {
  if(!client||!email)return;
  try {
   const saved=sessionStorage.getItem(storageKey);
   if(saved){const p=JSON.parse(saved) as CreditGrantInput;
    if(p.accountId!==accountId||typeof p.requestKey!=='string'||!Number.isInteger(p.quantity)||typeof p.reason!=='string')throw Error();
    if('kind' in p){const extended=p as ExpiringGrantInput;setKind(extended.kind);setValidity(extended.validity);setDate(extended.date??'');}
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
   const input=pending??{accountId,email,quantity,reason:reason.trim(),requestKey:crypto.randomUUID(),...(ready?{kind,validity,date:validity==='custom'?date:null}:{})};
   // Persist BEFORE sending. A reload or lost response must retry the same key.
   sessionStorage.setItem(storageKey,JSON.stringify(input));setPending(input);
   if('kind' in input)await requestExpiringGrant(client,input as ExpiringGrantInput);else await requestCreditGrant(client,input);
   sessionStorage.removeItem(storageKey);setPending(null);setQuantity(1);setReason('');
   setNotice(`${input.quantity} 크레딧을 지급했습니다.`);dialog.current?.close();onGranted();
  }catch{setNotice('지급 완료를 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요. 대상 정보가 변경됐다면 운영 확인이 필요합니다.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <div className="admin-panel">
  <button ref={trigger} type="button" className="button button--outline button--small" disabled={!email||!client} onClick={open}>크레딧 지급</button>
  {notice?<p role="status" className="admin-hint">{notice}</p>:null}
  <dialog ref={dialog} className="my-lab-dialog admin-credit-dialog" aria-labelledby={`${formId}-title`} onCancel={event=>{if(lock.current)event.preventDefault();}} onClose={()=>trigger.current?.focus()}>
   <h3 id={`${formId}-title`}>크레딧 지급 확인</h3>
   <p>대상 이메일: {pending?.email??email}</p><p style={{overflowWrap:'anywhere'}}>회원 UID: {accountId}</p>
   <p className="admin-muted">운영 지급 · 유료 구매 크레딧과 별도 기록</p>
   <form className="admin-stack" onSubmit={event=>{event.preventDefault();void grant();}}>
    <label htmlFor={`${formId}-quantity`}>지급 수량 (1~100)</label>
    <input className="admin-search__input" id={`${formId}-quantity`} type="number" min={1} max={100} required value={quantity} disabled={busy||!!pending} onChange={e=>setQuantity(Number(e.target.value))}/>
    <label htmlFor={`${formId}-kind`}>지급 유형</label>
    <select id={`${formId}-kind`} value={kind} disabled={!ready||busy||!!pending} onChange={e=>setKind(e.target.value as GrantKind)}>{Object.entries(grantKinds).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
    <fieldset disabled={!ready||busy||!!pending}><legend>사용기한</legend><div className="admin-search__row">{(['none','7','14','30','90','custom'] as const).map(value=><label key={value}><input type="radio" name={`${formId}-validity`} value={value} checked={validity===value} onChange={()=>setValidity(value)}/>{value==='none'?'무기한':value==='custom'?'직접 지정':`${value}일`}</label>)}</div>
    {validity==='custom'?<label>만료 날짜 (한국시간)<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>:null}</fieldset>
    {!ready?<p className="admin-hint">사용기한·지급 유형 확장은 서버 적용 대기 중입니다. 기존 무기한 관리자 지급은 사용할 수 있습니다.</p>:null}
    <p>만료일: {validity==='none'?'무기한':validity==='custom'?`${date || '날짜 선택'} 23:59:59 (한국시간)`:`서버 지급 시각으로부터 ${validity}일 후 (한국시간 표시)`}</p>
    <label htmlFor={`${formId}-reason`}>지급 사유</label>
    <textarea className="admin-search__input" id={`${formId}-reason`} required maxLength={500} rows={3} value={reason} disabled={busy||!!pending} onChange={e=>setReason(e.target.value)}/>
    <p>위 회원에게 {quantity} 크레딧을 지급합니다. 대상과 사유를 확인하세요.</p>
    {notice?<p role="status">{notice}</p>:null}
    <div className="admin-search__row"><button type="button" className="button button--outline" disabled={busy} onClick={()=>dialog.current?.close()}>닫기</button>
    <button type="submit" className="button button--primary" disabled={busy||!reason.trim()||quantity<1||quantity>100}>{busy?'지급 중입니다':pending?'동일 요청 다시 확인':'확인 후 지급'}</button></div>
   </form>
  </dialog>
 </div>;
}
