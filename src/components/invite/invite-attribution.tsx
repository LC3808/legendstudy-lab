'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {SchoolName} from '@/components/school/school-name';
import {markSchoolConfirmed,readSchoolConfirm,clearSchoolConfirm} from '@/lib/invite/contract';
import {logAnalytics} from '@/lib/analytics/client';
import {analyticsEvents as AE} from '@/lib/analytics/events';

/**
 * School-confirm card for an invited signup. The app-wide watcher performs the attribution
 * (on any page) and hands the inviting school here via session storage; this card only offers
 * to set that school — the user confirms, it is never auto-applied. Shown on growth pages
 * (/school). Dormant until an attribution with a school has occurred.
 */
export function InviteAttributionPrompt(){
  const {client,user}=useAuth();
  const [confirm,setConfirm]=useState<{office:string;school:string}|null>(()=>readSchoolConfirm());
  const [done,setDone]=useState(false);

  useEffect(()=>{
    const sync=()=>{ const c=readSchoolConfirm(); if(c) setConfirm(c); };
    try{ globalThis.addEventListener?.('ls-invite-school-confirm',sync); }catch{/* ignore */}
    return()=>{ try{ globalThis.removeEventListener?.('ls-invite-school-confirm',sync); }catch{/* ignore */} };
  },[]);

  const apply=useCallback(async()=>{
    if(!client||!user||!confirm)return;
    try{
      await client.from('profiles').update({neis_office_code:confirm.office,neis_school_code:confirm.school}).eq('id',user.id);
      await markSchoolConfirmed(client);
      logAnalytics(AE.schoolInviteSchoolConfirmed,{source:'web'},user.id);
    }catch{/* best-effort; 사용자는 /account 에서 직접 설정 가능 */}
    clearSchoolConfirm(); setDone(true); setConfirm(null);
  },[client,user,confirm]);

  const dismiss=useCallback(()=>{ clearSchoolConfirm(); setDone(true); setConfirm(null); },[]);

  if(done||!confirm)return null;
  return <section className="invite-confirm school-card">
    <h2>🏫 친구의 초대로 방문했어요</h2>
    <p><SchoolName office={confirm.office} school={confirm.school}/> 친구의 초대예요. 학교를 이 학교로 설정할까요?</p>
    <div className="school-card__actions">
      <button type="button" className="button button--primary" onClick={()=>void apply()}>학교 확인</button>
      <Link className="button button--outline" href="/account/" onClick={dismiss}>다른 학교 선택</Link>
    </div>
  </section>;
}
