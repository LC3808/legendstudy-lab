import {Suspense} from 'react';
import {InviteLanding} from '@/components/invite/invite-landing';
import {buildPublicMetadata} from '@/lib/brand';

export const metadata=buildPublicMetadata(
  '레전드스터디+ 초대',
  '친구의 초대로 레전드스터디+를 시작하고 우리 학교 공부 순위에 참여해 보세요.',
  '/invite/',
  {index:false},
);

export default function InvitePage(){
  return <Suspense fallback={<div className="invite-landing content-wrap content-wrap--detail"><section className="invite-card"><p role="status">초대 정보를 확인하고 있어요.</p></section></div>}>
    <InviteLanding/>
  </Suspense>;
}
