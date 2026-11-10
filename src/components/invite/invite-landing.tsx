'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useAuth} from '@/components/auth-context';
import {SchoolName} from '@/components/school/school-name';
import {lookupInvite,recordInviteVisit,rememberPendingInvite,isInviteToken,type InviteLookup} from '@/lib/invite/contract';

/**
 * Invite landing (/invite?t=<token>). Opaque token only — no inviter identity or PII.
 * Anonymous viewers are supported; the token is remembered (per device) so signup can be
 * attributed afterward. Shows the real inviting school when resolvable, else a generic
 * invite; invalid/expired links fall back to a plain service intro — never fabricated data.
 */
export function InviteLanding(){
  const {client}=useAuth();
  const params=useSearchParams();
  const token=params?.get('t')??'';
  const validToken=isInviteToken(token);
  const [state,setState]=useState<{loading:boolean;data:InviteLookup|null}>({loading:true,data:null});

  useEffect(()=>{
    if(!validToken||!client)return;            // invalid/missing token → handled in render (generic intro)
    rememberPendingInvite(token);
    let active=true;
    void recordInviteVisit(client,token,'web');
    void lookupInvite(client,token).then(d=>{ if(active) setState({loading:false,data:d}); });
    return()=>{active=false;};
  },[client,token,validToken]);

  const signupHref='/signup/?next=%2Fschool%2F';
  const loading=validToken&&state.loading;
  const valid=validToken&&state.data?.valid===true?state.data:null;

  return <div className="invite-landing content-wrap content-wrap--detail">
    <section className="invite-card">
      {loading&&<p role="status">초대 정보를 확인하고 있어요.</p>}
      {!loading&&valid&&valid.hasSchool&&valid.officeCode&&valid.schoolCode&&<>
        <h1>🏫 <SchoolName office={valid.officeCode} school={valid.schoolCode}/> 친구가 함께 공부하자고 초대했어요!</h1>
        <p>레전드스터디+에서 공부시간을 기록하고 우리 학교 순위를 높여보세요.</p>
      </>}
      {!loading&&valid&&!valid.hasSchool&&<>
        <h1>🏫 친구가 레전드스터디+에 초대했어요!</h1>
        <p>공부시간을 기록하고 우리 학교 친구들과 함께 순위에 참여해 보세요.</p>
      </>}
      {!loading&&!valid&&<>
        <h1>레전드스터디+</h1>
        <p>공부시간을 기록하고 우리 학교 친구들과 함께 순위에 참여해 보세요.</p>
        {state.data&&state.data.valid===false&&state.data.reason==='expired'&&<p className="focus-note">이 초대 링크는 만료되었어요. 그래도 지금 바로 시작할 수 있어요.</p>}
      </>}
      <div className="invite-card__actions">
        <Link className="button button--primary" href={signupHref}>레전드스터디+ 시작하기</Link>
        <Link className="button button--outline" href="/login/?next=%2Fschool%2F">이미 계정이 있어요</Link>
      </div>
      <p className="focus-note">학교별 공부 순위는 가입 후 우리 학교를 등록하면 확인할 수 있어요.</p>
    </section>
  </div>;
}
