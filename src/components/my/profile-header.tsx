'use client';
import {AdminSchoolName as SchoolName} from '@/components/admin/admin-school-name';
import {useAuth} from '@/components/auth-context';
import type {ReactNode} from 'react';
import {ProfileEditor} from './profile-editor';
import {myIdentity} from '@/lib/my/contract';
import {readMyProfile, type MyProfile} from '@/lib/my/data';
import {DataStatus, useOwnerData} from './owner-data';

/** Canonical APP profile fields; unset values remain blank. */
export function ProfileHeader({children}:{children?:ReactNode}={}) {
 const result = useOwnerData(readMyProfile);
 if (!result.data) return <DataStatus error={result.error} reload={result.reload} />;
 return <ProfileHeaderView profile={result.data} reload={result.reload}>{children}</ProfileHeaderView>;
}
export function ProfileHeaderView({profile,reload,children}:{profile:MyProfile;reload:()=>void;children?:ReactNode}) {
 const {user}=useAuth();
 if(!user)return null;
 const identity = myIdentity({id: user.id, email: user.email ?? undefined}, profile);
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
    {(hasSchool||profile.academic_status)&&<div><dt>현재 상태</dt><dd>{profile.academic_status?identity.statusLabel:'설정 안 함'}</dd></div>}
    <>
     {hasSchool&&<div><dt>학교</dt><dd>{hasSchool&&<SchoolName office={identity.school.officeCode} school={identity.school.schoolCode} />}</dd></div>}
     {identity.grade&&<div><dt>학년</dt><dd>{identity.grade ? `${identity.grade}학년` : ''}</dd></div>}
    </>
   </dl>
   <ProfileEditor compact key={JSON.stringify(profile)} profile={profile} reload={reload}/>
   {children&&<div className="my-profile-goals">{children}</div>}
  </div>
 );
}
