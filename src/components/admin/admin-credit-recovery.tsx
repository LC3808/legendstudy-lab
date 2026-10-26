'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {useAuth} from '@/components/auth-context';
import type {AdminCreditGrant} from '@/lib/admin/contract';
import {creditOperationsReady,recoveryInfo,requestCreditRecovery,type RecoveryInfo,type RecoveryInput} from '@/lib/admin/finance-boundary';
import {creditOriginLabel,formatDate,formatCreditExpiry} from '@/lib/admin/format';

export function AdminCreditRecovery({accountId,email,grant,onRecovered}:{accountId:string;email:string|null;grant:AdminCreditGrant;onRecovered:()=>void}){
 const {client,user,status}=useAuth();const id=useId();const dialog=useRef<HTMLDialogElement>(null);const lock=useRef(false);
 const [ready,setReady]=useState(false);const [info,setInfo]=useState<RecoveryInfo|null>(null);const [quantity,setQuantity]=useState(1);
 const [category,setCategory]=useState('관리자 오지급');const [reason,setReason]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const [pending,setPending]=useState<RecoveryInput|null>(null);
 const key=`legendstudy-admin-recovery:${user?.id}:${accountId}:${grant.grantId}`;
 useEffect(()=>{let active=true;if(client&&status==='authenticated')void creditOperationsReady(client,accountId).then(v=>{if(!active)return;setReady(v);try{const raw=sessionStorage.getItem(key);if(raw){const old=JSON.parse(raw) as RecoveryInput;if(old.user===accountId&&old.grant===grant.grantId&&typeof old.key==='string'&&Number.isSafeInteger(old.quantity)&&old.quantity>0&&typeof old.reason==='string')setPending(old);}}catch{/* open reports invalid pending data. */}}).catch(()=>{});return()=>{active=false;};},[client,accountId,status,key,grant.grantId]);
 const eligible=['admin_grant','promotion','compensation'].includes(grant.origin)&&!grant.expired&&grant.available>0;
 async function open(){
  if(!client||!ready||lock.current)return;lock.current=true;setBusy(true);setNotice('');
  try{
   const stored=sessionStorage.getItem(key);const old=stored?JSON.parse(stored) as RecoveryInput:null;
   if(old&&(old.user!==accountId||old.grant!==grant.grantId||!Number.isSafeInteger(old.quantity)||old.quantity<=0||typeof old.reason!=='string'||typeof old.key!=='string'))throw Error();
   setPending(old);const current=await recoveryInfo(client,accountId,grant.grantId);setInfo(current);setQuantity(old?.quantity??current.recoverable);dialog.current?.showModal();
  }catch{setNotice('회수 가능 수량을 확인하지 못했습니다. 잠시 후 다시 시도하세요.');}
  finally{lock.current=false;setBusy(false);}
 }
 async function recover(){
  if(!client||!ready||!info||lock.current)return;
  if(!pending&&(!Number.isSafeInteger(quantity)||quantity<1||quantity>info.recoverable||!reason.trim()))return;
  lock.current=true;setBusy(true);
  try{
   const input=pending??{user:accountId,grant:grant.grantId,quantity,reason:`${category}: ${reason.trim()}`,key:crypto.randomUUID()};
   sessionStorage.setItem(key,JSON.stringify(input));setPending(input);
   await requestCreditRecovery(client,input);sessionStorage.removeItem(key);setPending(null);setNotice(`${input.quantity} 크레딧을 회수했습니다.`);dialog.current?.close();onRecovered();
  }catch{setNotice('회수 완료를 확인하지 못했습니다. 같은 요청으로 다시 확인하세요. 잔액이 변경된 경우 초과 회수는 서버에서 차단됩니다.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <><button type="button" className="button button--outline button--small" disabled={!ready||(!eligible&&!pending)||busy} onClick={()=>void open()} title={!ready?'서버 적용 승인 대기':!eligible?'구매·가입·학교 지급, 만료 또는 회수 가능 잔액 없음':undefined}>Credit 회수</button>
 {notice?<p role="status">{notice}</p>:null}
 <dialog ref={dialog} className="my-lab-dialog admin-credit-dialog" aria-labelledby={`${id}-title`} onCancel={e=>{if(lock.current)e.preventDefault();}}>
 <h3 id={`${id}-title`}>크레딧 회수 확인</h3><p>{email??accountId} · {creditOriginLabel(grant.origin)}</p><p>지급일 {formatDate(grant.createdAt)} · 만료일 {formatCreditExpiry(grant.expiresAt)}</p>
 {info?<><dl className="admin-recovery-facts">{[['최초 지급',info.initial],['사용 확정',info.used],['현재 미사용 잔액',info.balance],['예약',info.reserved],['기존 회수·조정',info.recovered],['만료 처리',info.expired],['회수 가능',info.recoverable]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value} Credit</dd></div>)}</dl>
 <form className="admin-stack" onSubmit={e=>{e.preventDefault();void recover();}}>
 <label htmlFor={`${id}-amount`}>회수할 수량</label><input id={`${id}-amount`} type="number" required min={1} max={pending?undefined:info.recoverable} value={quantity} disabled={busy||!!pending} onChange={e=>setQuantity(Number(e.target.value))}/>
 <label htmlFor={`${id}-category`}>회수 사유 유형</label><select id={`${id}-category`} value={category} disabled={busy||!!pending} onChange={e=>setCategory(e.target.value)}>{['관리자 오지급','이벤트 지급 오류','중복 지급','운영 정책에 따른 회수','기타'].map(v=><option key={v}>{v}</option>)}</select>
 <label htmlFor={`${id}-reason`}>회수 사유</label><textarea id={`${id}-reason`} required maxLength={450} value={pending?.reason??reason} disabled={busy||!!pending} onChange={e=>setReason(e.target.value)}/>
 <p>회수 후 예상 사용 가능 잔액: {Math.max(0,info.recoverable-quantity)} Credit (해당 지급 건 기준)</p><p>사용·예약 수량과 다른 지급 건은 변경하지 않습니다.</p>
 {notice?<p role="status">{notice}</p>:null}<div className="admin-search__row"><button type="button" className="button button--outline" disabled={busy} onClick={()=>dialog.current?.close()}>닫기</button><button type="submit" className="button button--primary" disabled={busy||(!pending&&(!reason.trim()||quantity<1||quantity>info.recoverable))}>{busy?'회수 중':pending?'동일 요청 다시 확인':'크레딧 회수 실행'}</button></div>
 </form></>:null}</dialog></>;
}
