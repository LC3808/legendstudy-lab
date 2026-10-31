'use client';
import {useEffect, useState, useRef} from 'react';
import {getBrowserAuthClient} from '@/lib/browser-auth-client';

export type BetaCredit = {version:'essay-beta-credit-v2';active:false;status:'inactive'|'ended';ends_at?:string} | {
  version:'essay-beta-credit-v2';active:true;status:'active';grant_id:string;day:string;available:number;expires_at:string;
  ends_at:string;campaign_id:string;policy_version:string;notice_id:string|null;notice_seen:boolean;
};
export function parseBetaCredit(value:unknown):BetaCredit|null {
  if(!value || typeof value!=='object') return null;
  const v=value as Record<string,unknown>;
  if(v.version!=='essay-beta-credit-v2') return null;
  if(v.active===false && v.status==='inactive') return {version:v.version,active:false,status:'inactive'};
  if(v.active===false && v.status==='ended' && typeof v.ends_at==='string' && Number.isFinite(Date.parse(v.ends_at))) return v as BetaCredit;
  if(v.active!==true || v.status!=='active' || typeof v.grant_id!=='string' || typeof v.day!=='string' ||
    !Number.isInteger(v.available) || Number(v.available)<0 || Number(v.available)>1 ||
    typeof v.expires_at!=='string' || !Number.isFinite(Date.parse(v.expires_at)) ||
    typeof v.ends_at!=='string' || !Number.isFinite(Date.parse(v.ends_at)) ||
    typeof v.campaign_id!=='string' || typeof v.policy_version!=='string' || typeof v.notice_seen!=='boolean' || (v.notice_id!==null && typeof v.notice_id!=='string')) return null;
  return v as BetaCredit;
}
export function betaEndDate(end:string){
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(new Date(Date.parse(end)-1));
}
function BetaNotice({end,onClose}:{end:string;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog ref={dialog} aria-labelledby="beta-notice-title" onClose={onClose} style={{maxWidth:'min(32rem,calc(100vw - 32px))',borderRadius:16,padding:24}}>
    <h2 id="beta-notice-title">논술 LAB 베타 무료 이용 안내</h2>
    <p>인문논술 베타 대상 시험에서 매일 무료 첨삭 1회를 이용할 수 있어요. 매일 00:00 KST에 갱신되며 미사용분은 이월되지 않습니다.</p>
    <p>베타는 {betaEndDate(end)}까지 운영됩니다. 베타 무료 첨삭의 무료 재첨삭은 최초 완료 후 최대 14일 이내, 베타 종료 전까지 1회 가능합니다. 가입·구매 Credit의 기존 정책은 유지됩니다.</p>
    <p>사용 중 불편한 점은 기존 문의·피드백 경로로 알려주세요. 공지사항에서 안내를 다시 확인할 수 있어요.</p>
    <button className="button" onClick={()=>dialog.current?.close()}>확인</button>
  </dialog>;
}

/** Only LAB mounts this self-scoped claim. The backend owns dates, scope and balance. */
export function EssayBetaCredit(){
  const [state,setState]=useState<BetaCredit|null>(null);
  const [error,setError]=useState(false);
  const [retry,setRetry]=useState(0);
  const [notice,setNotice]=useState<{owner:string;data:Extract<BetaCredit,{active:true}>}|null>(null);
  const shown=useRef(new Set<string>());
  useEffect(()=>{
    const client=getBrowserAuthClient();
    if(!client) return;
    let alive=true, generation=0, timer:ReturnType<typeof setTimeout>|undefined;
    let lastGrant:string|undefined;
    let notifying=false;
    async function load(){
      const request=++generation;
      clearTimeout(timer);
      try{
        const owner=(await client!.auth.getSession()).data.session?.user.id;
        if(!alive || request!==generation) return;
        if(!owner){setState(null);setNotice(null);setError(false);lastGrant=undefined;return;}
        const response=await client!.rpc('essay_beta_daily_claim_v2');
        const current=(await client!.auth.getSession()).data.session?.user.id;
        if(!alive || request!==generation || owner!==current) return;
        // Safe staged rollout: an absent RPC is not an active beta campaign.
        if(response.error?.code==='PGRST202'){setState(null);setError(false);return;}
        const next=parseBetaCredit(response.data);
        if(response.error || !next) throw new Error('Beta credit unavailable');
        setState(next);setError(false);
        if(next.active){
          const noticeKey=owner+':'+next.campaign_id+':'+next.policy_version;
          if(!next.notice_seen && !shown.current.has(noticeKey)){
            shown.current.add(noticeKey);setNotice({owner,data:next});
          }
          const identity=owner+':'+next.grant_id;
          if(lastGrant!==identity){lastGrant=identity;notifying=true;window.dispatchEvent(new Event('legendstudy:credit-refresh'));notifying=false;}
          timer=setTimeout(()=>{setState(null);void load();},Math.max(1000,Math.min(86400000,Date.parse(next.expires_at)-Date.now()+100)));
        }
      }catch{if(alive && request===generation){setState(null);setError(true);}}
    }
    const refresh=()=>{if(!notifying) void load();};
    const visible=()=>{if(document.visibilityState==='visible') refresh();};
    const subscription=client.auth.onAuthStateChange((event)=>{
      if(event==='INITIAL_SESSION') return;
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
  if(error) return <aside className="content-wrap" role="status">베타 첨삭권을 확인하지 못했습니다. <button className="button button--small" onClick={()=>setRetry(v=>v+1)}>다시 확인</button></aside>;
  if(!state || (!state.active && state.status==='inactive')) return null;
  const closeNotice=()=>{
    const pending=notice;setNotice(null);
    if(!pending) return;
    void (async()=>{
      try{
        const client=getBrowserAuthClient();
        if((await client?.auth.getSession())?.data.session?.user.id!==pending.owner) return;
        await client?.rpc('essay_beta_notice_ack',{p_campaign:pending.data.campaign_id});
      }catch{/* Failed preference saves must not force a repeated dialog this session. */}
    })();
  };
  return <>
    <aside className="content-wrap essay-credit" aria-live="polite">
      <strong>{!state.active ? '베타 무료 첨삭 제공이 종료되었습니다.' : state.available===1 ? '오늘의 무료 첨삭 · 1회 남음' : '오늘의 무료 첨삭을 모두 사용했습니다.'}</strong>
      <p className="essay-credit__meta">{state.active ? `매일 00:00 KST 갱신 · 이월 없음 · ${state.available===0 && Date.parse(state.expires_at)<Date.parse(state.ends_at)?'다음 이용: 내일 00:00 KST · ':''}${betaEndDate(state.ends_at)}까지` : '가입·구매 Credit은 기존 정책대로 이용할 수 있어요.'}</p>
      <a href={state.active && state.notice_id ? `/notices/${state.notice_id}` : '/notices'}>베타 공지 다시 보기</a>
    </aside>
    {notice && <BetaNotice end={notice.data.ends_at} onClose={closeNotice}/>}
  </>;
}
