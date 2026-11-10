'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {SchoolName} from '@/components/school/school-name';
import {attributeSignup,markSchoolConfirmed,refreshMilestones,readPendingInvite,clearPendingInvite,type InviteAttribution} from '@/lib/invite/contract';
import {logAnalytics} from '@/lib/analytics/client';
import {analyticsEvents as AE} from '@/lib/analytics/events';

/**
 * After a logged-in user lands with a pending invite token, attribute the signup (server
 * decides: not self-invite, new signup within window, idempotent) and offer to set the
 * inviting school — the user confirms, it is never auto-applied. Dormant until the invite
 * RPCs are live (attributeSignup returns null → renders nothing). No PII, no fake data.
 */
export function InviteAttributionPrompt(){
  const {client,user,status}=useAuth();
  const [attr,setAttr]=useState<InviteAttribution|null>(null);
  const [done,setDone]=useState(false);

  useEffect(()=>{
    if(status!=='authenticated'||!client||!user)return;
    const token=readPendingInvite(); if(!token)return;
    let active=true;
    void attributeSignup(client,token).then(a=>{
      if(!active||!a)return;
      clearPendingInvite();
      if(a.attributed){
        logAnalytics(AE.schoolInviteSignup,{source:'web',campaign:'school_rank'},user.id);
        void refreshMilestones(client);
        if(a.reason==='ok'&&a.hasSchool&&a.officeCode&&a.schoolCode) setAttr(a);
      }
    });
    return()=>{active=false;};
  },[client,user,status]);

  const confirm=useCallback(async()=>{
    if(!client||!user||!attr?.officeCode||!attr?.schoolCode)return;
    try{
      await client.from('profiles').update({neis_office_code:attr.officeCode,neis_school_code:attr.schoolCode}).eq('id',user.id);
      await markSchoolConfirmed(client);
      logAnalytics(AE.schoolInviteSchoolConfirmed,{source:'web'},user.id);
    }catch{/* best-effort; 사용자는 /account 에서 직접 설정 가능 */}
    setDone(true); setAttr(null);
  },[client,user,attr]);

  if(done||!attr?.hasSchool||!attr.officeCode||!attr.schoolCode)return null;
  return <section className="invite-confirm school-card">
    <h2>🏫 친구의 초대로 방문했어요</h2>
    <p><SchoolName office={attr.officeCode} school={attr.schoolCode}/> 친구의 초대예요. 학교를 이 학교로 설정할까요?</p>
    <div className="school-card__actions">
      <button type="button" className="button button--primary" onClick={()=>void confirm()}>학교 확인</button>
      <Link className="button button--outline" href="/account/">다른 학교 선택</Link>
    </div>
  </section>;
}
