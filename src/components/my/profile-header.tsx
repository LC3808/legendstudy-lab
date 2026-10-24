'use client';
import {AdminSchoolName as SchoolName} from '@/components/admin/admin-school-name';
import {useAuth} from '@/components/auth-context';
import {myIdentity} from '@/lib/my/contract';
import {readMyProfile} from '@/lib/my/data';
import {DataStatus, useOwnerData} from './owner-data';

/**
 * 나의 프로필 — the identity glance at the top of MY, presentation only.
 *
 * The nickname is the canonical, optional `profiles.display_name`; when it is
 * unset the email stands alone as the name, and the email is never printed twice.
 * School and grade appear only when they are actually set, and the shape is built
 * by the shared `myIdentity` view contract so Auth, profiles and Credit stay the
 * independent authorities they already are. Nothing here is editable — 학교·학년 is
 * changed in its own section below — so this card only ever reads.
 */
export function ProfileHeader() {
 const {user} = useAuth();
 const result = useOwnerData(readMyProfile);
 if (!user) return null;
 if (!result.data) return <div className="my-panel my-profile-card"><DataStatus error={result.error} reload={result.reload} /></div>;
 const identity = myIdentity({id: user.id, email: user.email ?? undefined}, result.data);
 const hasSchool = Boolean(identity.school.officeCode && identity.school.schoolCode);
 const name = identity.displayName?.trim() || identity.email || '내 계정';
 const showEmail = Boolean(identity.displayName?.trim() && identity.email);
 return (
  <div className="my-panel my-profile-card">
   <div className="my-profile-card__identity">
    <p className="my-profile-card__name">{name}</p>
    {showEmail && <p className="my-identity__email">{identity.email}</p>}
   </div>
   <dl className="my-profile-card__facts">
    <div><dt>현재 상태</dt><dd>{identity.statusLabel}</dd></div>
    {hasSchool && <>
     <div><dt>학교</dt><dd><SchoolName office={identity.school.officeCode} school={identity.school.schoolCode} /></dd></div>
     <div><dt>학년</dt><dd>{identity.grade ? `${identity.grade}학년` : '미입력'}</dd></div>
    </>}
   </dl>
  </div>
 );
}
