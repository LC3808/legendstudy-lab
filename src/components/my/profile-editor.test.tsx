// @vitest-environment jsdom
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,expect,it,vi} from 'vitest';
import {ProfileEditor} from './profile-editor';
import {saveMyProfile} from '@/lib/my/data';
vi.mock('@/components/auth-context',()=>({useAuth:()=>({client:{},user:{id:'owner'}})}));
vi.mock('@/components/admin/admin-school-name',()=>({AdminSchoolName:({school}:{school:string|null})=><span>{school?'검증고등학교':'미설정'}</span>}));
vi.mock('@/lib/admin/school',()=>({searchSchools:vi.fn().mockResolvedValue([{office:'J10',code:'7530851',name:'검증고등학교',address:''}])}));
vi.mock('@/lib/my/data',()=>({assertOwner:vi.fn().mockResolvedValue(undefined),saveMyProfile:vi.fn().mockResolvedValue(undefined)}));
const empty={neis_office_code:null,neis_school_code:null,academic_status:null,grade_level:null};
beforeEach(()=>vi.clearAllMocks());
it.each(['1','2','3','retaker','other'])('saves grade %s independently of the selected school',async(value)=>{
 const u=userEvent.setup();const profile={...empty,neis_office_code:'J10',neis_school_code:'7530851',academic_status:'student',grade_level:2};
 render(<ProfileEditor compact profile={profile} reload={()=>{}}/>);
 await u.click(screen.getByRole('button',{name:'프로필 편집'}));
 expect(screen.getAllByRole('radio')).toHaveLength(5);
 const label=value==='retaker'?'재수/N수생':value==='other'?'해당 없음':`${value}학년`;
 await u.click(screen.getByRole('radio',{name:label}));
 expect(screen.getByRole('radio',{name:label})).toBeChecked();
 await u.click(screen.getByRole('button',{name:'프로필 저장'}));
 await waitFor(()=>expect(saveMyProfile).toHaveBeenCalledWith({},'owner',{...profile,academic_status:['1','2','3'].includes(value)?'student':value,grade_level:['1','2','3'].includes(value)?Number(value):null}));
});
it.each(['retaker','other'])('school search preserves %s choice',async(status)=>{
 const u=userEvent.setup();render(<ProfileEditor compact profile={{...empty,academic_status:status}} reload={()=>{}}/>);
 await u.click(screen.getByRole('button',{name:'프로필 편집'}));
 await u.type(screen.getByLabelText('학교 검색'),'검증');await u.click(screen.getByRole('button',{name:'검색'}));
 await u.click(await screen.findByRole('button',{name:'선택'}));
 await u.click(screen.getByRole('button',{name:'프로필 저장'}));
 await waitFor(()=>expect(saveMyProfile).toHaveBeenCalledWith({},'owner',{...empty,academic_status:status,neis_office_code:'J10',neis_school_code:'7530851'}));
});
it('edits the nickname through the same shared profile save',async()=>{
 const u=userEvent.setup();const reload=vi.fn();render(<ProfileEditor compact profile={empty} reload={reload}/>);
 await u.click(screen.getByRole('button',{name:'프로필 편집'}));await u.type(screen.getByLabelText('닉네임'),'나의 별명');
 await u.click(screen.getByRole('button',{name:'프로필 저장'}));
 await waitFor(()=>expect(saveMyProfile).toHaveBeenCalledWith({},'owner',{...empty,display_name:'나의 별명'}));expect(reload).toHaveBeenCalledOnce();
});
