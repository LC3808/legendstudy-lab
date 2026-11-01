'use client';
import {useEffect, useState, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {getBrowserAuthClient} from '@/lib/browser-auth-client';

export type BetaCredit = {version:'essay-beta-credit-v2';active:false;status:'inactive'|'ended';ends_at?:string} | {
  version:'essay-beta-credit-v2';active:true;status:'active';grant_id:string;day:string;available:number;daily_limit?:number;expires_at:string;
  ends_at:string;campaign_id:string;policy_version:string;notice_id:string|null;notice_seen:boolean;
};
export function parseBetaCredit(value:unknown):BetaCredit|null {
  if(!value || typeof value!=='object') return null;
  const v=value as Record<string,unknown>;
  if(v.version!=='essay-beta-credit-v2') return null;
  if(v.active===false && v.status==='inactive') return {version:v.version,active:false,status:'inactive'};
  if(v.active===false && v.status==='ended' && typeof v.ends_at==='string' && Number.isFinite(Date.parse(v.ends_at))) return v as BetaCredit;
  if(v.active!==true || v.status!=='active' || typeof v.grant_id!=='string' || typeof v.day!=='string' ||
    !Number.isInteger(v.available) || Number(v.available)<0 || !Number.isInteger(v.daily_limit??1) || Number(v.daily_limit??1)<1 || Number(v.daily_limit??1)>100 || Number(v.available)>Number(v.daily_limit??1) ||
    typeof v.expires_at!=='string' || !Number.isFinite(Date.parse(v.expires_at)) ||
    typeof v.ends_at!=='string' || !Number.isFinite(Date.parse(v.ends_at)) ||
    typeof v.campaign_id!=='string' || typeof v.policy_version!=='string' || typeof v.notice_seen!=='boolean' || (v.notice_id!==null && typeof v.notice_id!=='string')) return null;
  return v as BetaCredit;
}
export function betaEndDate(end:string){
  if((Date.parse(end)+9*3600000)%86400000!==0) return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(end))+' KST';
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(new Date(Date.parse(end)-1))+' 23:59';
}
function BetaNotice({end,limit=1,onClose,onStart}:{end:string;limit?:number;onClose:(hide:boolean)=>void;onStart:()=>Promise<string|null>}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [hide,setHide]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState<string|null>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog ref={dialog} className="beta-onboarding" aria-labelledby="beta-notice-title" onCancel={e=>{e.preventDefault();onClose(hide);}} style={{maxWidth:'min(32rem,calc(100vw - 32px))',borderRadius:16,padding:24}}>
    <h2 id="beta-notice-title">논술 LAB 베타 서비스 안내</h2>
    <p>인문논술 서비스를 매일 {limit}회 무료 이용할 수 있어요.</p>
    <p>매일 0시(자정, 한국 시간)에 무료 첨삭 이용 횟수가 갱신되며 미사용분은 소멸돼요.</p>
    <p>베타 서비스는 {betaEndDate(end)}까지 운영돼요. 베타 무료 첨삭권과 무료 재첨삭은 베타 서비스 기간 동안만 이용할 수 있어요.</p>
    <p>가입 축하 무료 크레딧(3개)과 구매 크레딧은 기존 정책대로 이용할 수 있어요.</p>
    <p>사용 중 불편한 점은 문의·건의사항으로 알려주세요. 공지사항에서 안내를 다시 확인할 수 있어요.</p>
    <label><input type="checkbox" checked={hide} disabled={busy} onChange={e=>setHide(e.target.checked)}/> 다음부터 보지 않기</label>
    {message&&<p role="status">{message}</p>}
    <div className="my-actions"><button className="button" disabled={busy} onClick={()=>onClose(hide)}>확인/닫기</button>
    <button className="button button--primary" disabled={busy} onClick={async()=>{setBusy(true);try{const result=await onStart();if(result)setMessage(result);else onClose(hide);}catch{setMessage('이용 가능 여부를 확인하지 못했습니다. 다시 시도해 주세요.');}finally{setBusy(false);}}}>{busy?'확인 중…':'무료 첨삭 이용하러 가기'}</button></div>
  </dialog>;
}
const intro={ends_at:'2026-11-10T15:00:00Z',daily_limit:1,campaign_id:'beta-202611',policy_version:'daily-v2'};
const noticeKey=(owner:string,data:typeof intro)=>`beta-onboarding:${owner}:${data.campaign_id}:${data.policy_version}`;
function hidden(key:string){try{return localStorage.getItem(key)==='true';}catch{return false;}}

/** Entry and start read status only. Submission owns the existing daily claim. */
export function EssayBetaCredit(){
  const router=useRouter();
  const [state,setState]=useState<BetaCredit|null>(null);
  const [error,setError]=useState(false);
  const [retry,setRetry]=useState(0);
  const [notice,setNotice]=useState<{owner:string;data:typeof intro}|null>(null);
  const shown=useRef(new Set<string>());
  useEffect(()=>{
    const client=getBrowserAuthClient();
    if(!client) return;
    let currentOwner:string|undefined;
    let alive=true, generation=0, timer:ReturnType<typeof setTimeout>|undefined;
    function show(owner:string,data:typeof intro){
      const key=noticeKey(owner,data);
      if(Date.now()<Date.parse(data.ends_at)&&!hidden(key)&&!shown.current.has(key)){
        shown.current.add(key);setNotice({owner,data});
      }
    }
    async function load(){
      const request=++generation;
      clearTimeout(timer);
      try{
        const owner=(await client!.auth.getSession()).data.session?.user.id;
        if(!alive || request!==generation) return;
        currentOwner=owner;
        if(!owner){setState(null);setError(false);show('guest',intro);return;}
        const response=await client!.rpc('essay_beta_daily_status_v2');
        const current=(await client!.auth.getSession()).data.session?.user.id;
        if(!alive || request!==generation || owner!==current) return;
        // Safe staged rollout: an absent RPC is not an active beta campaign.
        if(response.error?.code==='PGRST202'){setState(null);setError(false);return;}
        const next=parseBetaCredit(response.data);
        if(response.error || !next) throw new Error('Beta credit unavailable');
        setState(next);setError(false);
        if(!next.active&&next.status==='inactive')show(owner,intro);
        if(next.active){
          show(owner,{...next,daily_limit:next.daily_limit??1});
          timer=setTimeout(()=>{setState(null);void load();},Math.max(1000,Math.min(86400000,Date.parse(next.expires_at)-Date.now()+100)));
        }
      }catch{if(alive && request===generation){setState(null);setError(true);}}
    }
    const refresh=()=>{void load();};
    const visible=()=>{if(document.visibilityState==='visible') refresh();};
    const subscription=client.auth.onAuthStateChange((event,session)=>{
      if(event==='INITIAL_SESSION'||session?.user.id===currentOwner) return;
      currentOwner=session?.user.id;
      ++generation;setState(null);setNotice(null);setError(false);
      // Avoid awaiting another Supabase auth operation inside its auth callback.
      queueMicrotask(refresh);
    });
    window.addEventListener('focus',refresh);
    window.addEventListener('legendstudy:credit-refresh',refresh);
    document.addEventListener('visibilitychange',visible);
    void load();
    return()=>{alive=false;++generation;clearTimeout(timer);subscription.data.subscription.unsubscribe();window.removeEventListener('focus',refresh);window.removeEventListener('legendstudy:credit-refresh',refresh);document.removeEventListener('visibilitychange',visible);};
  },[retry]);
  const closeNotice=(hide:boolean)=>{
    if(hide&&notice){try{localStorage.setItem(noticeKey(notice.owner,notice.data),'true');}catch{/* Preference failure never blocks LAB. */}}
    setNotice(null);
  };
  const start=async()=>{
    const client=getBrowserAuthClient();
    const owner=(await client?.auth.getSession())?.data.session?.user.id;
    if(!owner){router.push('/login/?next=%2Fessay-lab%2F');return '로그인 후 이용할 수 있습니다.';}
    const response=await client!.rpc('essay_beta_daily_status_v2');
    if((await client!.auth.getSession()).data.session?.user.id!==owner)return '로그인 상태가 변경되었습니다. 다시 확인해 주세요.';
    const latest=parseBetaCredit(response.data);
    if(response.error||!latest)throw Error('Status unavailable');
    setState(latest);
    if(!latest.active)return latest.status==='ended'?'베타 무료 첨삭 제공이 종료되었습니다.':'베타 무료 이용 활성화를 준비 중입니다.';
    return latest.available>0?null:'오늘의 무료 첨삭을 모두 사용했습니다. 다음 이용 가능 시각을 확인해 주세요.';
  };
  return <>
    {error&&<aside role="status">베타 첨삭권을 확인하지 못했습니다. <button onClick={()=>setRetry(v=>v+1)}>다시 확인</button></aside>}
    {state&&(state.active||state.status==='ended')&&<aside className="content-wrap essay-credit" aria-live="polite">
      <strong>{!state.active ? '베타 무료 첨삭 제공이 종료되었습니다.' : state.available>0 ? `오늘의 무료 첨삭 · ${state.available}회 남음` : '오늘의 무료 첨삭을 모두 사용했습니다.'}</strong>
      <p className="essay-credit__meta">{state.active ? `매일 00시(자정, 한국 시간) 갱신 · 이월 없음 · ${state.available===0 && Date.parse(state.expires_at)<Date.parse(state.ends_at)?'다음 이용: 내일 00:00 KST · ':''}${betaEndDate(state.ends_at)}까지` : '가입·구매 Credit은 기존 정책대로 이용할 수 있어요.'}</p>
      <a href={state.active && state.notice_id ? `/notices/${state.notice_id}` : '/notices'}>베타 공지 다시 보기</a>
    </aside>}
    {notice && <BetaNotice end={notice.data.ends_at} limit={notice.data.daily_limit} onClose={closeNotice} onStart={start}/>}
  </>;
}
