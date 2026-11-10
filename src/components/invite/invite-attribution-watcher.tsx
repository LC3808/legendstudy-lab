'use client';
import {useEffect} from 'react';
import {useAuth} from '@/components/auth-context';
import {attributeSignup,refreshMilestones,readPendingInvite,clearPendingInvite,rememberSchoolConfirm} from '@/lib/invite/contract';
import {logAnalytics} from '@/lib/analytics/client';
import {analyticsEvents as AE} from '@/lib/analytics/events';

/**
 * App-wide invite attribution. Mounted once in the root layout so a signup is attributed on
 * ANY page after login — attribution never depends on the user reaching /school. No UI.
 * Dormant until the invite RPCs are live (attributeSignup returns null). The server (not the
 * client) decides validity: not self-invite, new signup within the window, idempotent.
 * On success with a school, it hands the school codes to the confirm card via session storage.
 */
export function InviteAttributionWatcher(){
  const {client,user,status}=useAuth();
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
        if(a.reason==='ok'&&a.hasSchool&&a.officeCode&&a.schoolCode){
          rememberSchoolConfirm(a.officeCode,a.schoolCode);
          try{ globalThis.dispatchEvent?.(new Event('ls-invite-school-confirm')); }catch{/* ignore */}
        }
      }
    });
    return()=>{active=false;};
  },[client,user,status]);
  return null;
}
