'use client';
import {AdminSchoolName as SchoolName} from '@/components/admin/admin-school-name';
import {useAuth} from '@/components/auth-context';
import {ProfileEditor} from './profile-editor';
import {myIdentity} from '@/lib/my/contract';
import {readMyProfile} from '@/lib/my/data';
import {DataStatus, useOwnerData} from './owner-data';

/** Canonical APP profile fields; unset values remain blank. */
export function ProfileHeader() {
 const {user} = useAuth();
 const result = useOwnerData(readMyProfile);
 if (!user) return null;
 if (!result.data) return <div className="my-panel my-profile-card"><DataStatus error={result.error} reload={result.reload} /></div>;
 const identity = myIdentity({id: user.id, email: user.email ?? undefined}, result.data);
 const hasSchool = Boolean(identity.school.officeCode && identity.school.schoolCode);
 const name = identity.displayName?.trim() || '';
 const showEmail = Boolean(identity.email);
 return (
  <div className="my-panel my-profile-card">
   <div className="my-profile-card__identity">
    <p className="my-profile-card__name">{name}</p>
    {showEmail && <p className="my-identity__email">{identity.email}</p>}
   </div>
   <dl className="my-profile-card__facts">
    <div><dt>현재 상태</dt><dd>{hasSchool?'재학생':result.data.academic_status?identity.statusLabel:''}</dd></div>
    <>
     <div><dt>학교</dt><dd>{hasSchool&&<SchoolName office={identity.school.officeCode} school={identity.school.schoolCode} />}</dd></div>
     <div><dt>학년</dt><dd>{identity.grade ? `${identity.grade}학년` : ''}</dd></div>
    </>
   </dl>
   <ProfileEditor compact key={JSON.stringify(result.data)} profile={result.data} reload={result.reload}/>
  </div>
 );
}
