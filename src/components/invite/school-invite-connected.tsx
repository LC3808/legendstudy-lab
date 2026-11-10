'use client';
import {useEffect,useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {SchoolInviteButton} from '@/components/school/invite-button';
import {createInvite,inviteUrl} from '@/lib/invite/contract';
import {logAnalytics} from '@/lib/analytics/client';
import {analyticsEvents as AE} from '@/lib/analytics/events';

/**
 * SchoolInviteButton wired to the invite-token RPC. A token is created once per device
 * (cached) and the invite URL carries only the opaque token — never a user id. Guarded:
 * if the RPC is absent/errors the token URL stays null and SchoolInviteButton falls back
 * to the public landing URL (current behavior) — no regression, no fabricated link.
 */
export function SchoolInviteConnected({schoolName}:{schoolName?:string|null}){
  const {client,user,status}=useAuth();
  // Lazy-read any cached token for this device/user so no synchronous setState is needed.
  const [url,setUrl]=useState<string|null>(()=>{ try{ return user?(globalThis.localStorage?.getItem(`ls_invite_link_${user.id}`)??null):null; }catch{ return null; } });
  useEffect(()=>{
    if(status!=='authenticated'||!client||!user||url)return;
    const key=`ls_invite_link_${user.id}`;
    let active=true;
    void createInvite(client).then(link=>{
      if(!active||!link)return;
      const u=inviteUrl(link.token); setUrl(u);
      try{ globalThis.localStorage?.setItem(key,u); }catch{/* ignore */}
    });
    return()=>{active=false;};
  },[client,user,status,url]);
  return <SchoolInviteButton
    schoolName={schoolName}
    buildUrl={url?()=>url:undefined}
    onShared={ch=>logAnalytics(AE.schoolInviteShare,{source:ch,campaign:'school_rank'})}
  />;
}
