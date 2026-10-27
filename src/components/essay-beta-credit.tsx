'use client';
import {useEffect, useState} from 'react';
import {getBrowserAuthClient} from '@/lib/browser-auth-client';

export type BetaCredit = {version:'essay-beta-credit-v1';active:false} | {
  version:'essay-beta-credit-v1';active:true;grant_id:string;day:string;available:number;expires_at:string;
};
export function parseBetaCredit(value:unknown):BetaCredit|null {
  if(!value || typeof value!=='object') return null;
  const v=value as Record<string,unknown>;
  if(v.version!=='essay-beta-credit-v1') return null;
  if(v.active===false) return {version:v.version,active:false};
  if(v.active!==true || typeof v.grant_id!=='string' || typeof v.day!=='string' ||
    !Number.isInteger(v.available) || Number(v.available)<0 || Number(v.available)>2 ||
    typeof v.expires_at!=='string' || !Number.isFinite(Date.parse(v.expires_at))) return null;
  return v as BetaCredit;
}

/** Only LAB mounts this self-scoped claim. The backend owns dates, scope and balance. */
export function EssayBetaCredit(){
  const [state,setState]=useState<BetaCredit|null>(null);
  const [error,setError]=useState(false);
  const [retry,setRetry]=useState(0);
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
        if(!owner){setState(null);setError(false);lastGrant=undefined;return;}
        const response=await client!.rpc('essay_beta_daily_claim');
        const current=(await client!.auth.getSession()).data.session?.user.id;
        if(!alive || request!==generation || owner!==current) return;
        // Safe staged rollout: an absent RPC is not an active beta campaign.
        if(response.error?.code==='PGRST202'){setState(null);setError(false);return;}
        const next=parseBetaCredit(response.data);
        if(response.error || !next) throw new Error('Beta credit unavailable');
        setState(next);setError(false);
        if(next.active){
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
      ++generation;setState(null);setError(false);
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
  if(!state?.active) return null;
  return <aside className="content-wrap essay-credit" aria-live="polite"><strong>논술 LAB 무료 베타 · 오늘 남은 무료 첨삭권 {state.available}개</strong><p className="essay-credit__meta">매일 첫 논술 LAB 접속 시 2개가 지급되며, 한국시간 당일 자정에 만료됩니다. 베타 대상 시험에 사용할 수 있으며 가입·구매 크레딧은 별도로 유지됩니다.</p></aside>;
}
