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
it('selecting a school enables optional grade and saves student without a second status choice',async()=>{
 const u=userEvent.setup();render(<ProfileEditor profile={empty} reload={()=>{}}/>);
 await u.click(screen.getByRole('button',{name:'학교·학년 설정'}));
 expect(screen.queryByRole('option',{name:'재학생'})).not.toBeInTheDocument();
 await u.type(screen.getByLabelText('학교 검색'),'검증');await u.click(screen.getByRole('button',{name:'검색'}));
 await u.click(await screen.findByRole('button',{name:'선택'}));
 expect(screen.queryByLabelText('현재 상태')).not.toBeInTheDocument();
 expect(screen.getByLabelText('학년')).toHaveValue('');
 await u.click(screen.getByRole('button',{name:'학교·학년 저장'}));
 await waitFor(()=>expect(saveMyProfile).toHaveBeenCalledWith({},'owner',{...empty,neis_office_code:'J10',neis_school_code:'7530851',academic_status:'student'}));
});
it('shows a legacy school even when status was not set, and explicitly clearing it enables nonstudent choices',async()=>{
 const u=userEvent.setup();render(<ProfileEditor profile={{...empty,neis_office_code:'J10',neis_school_code:'7530851'}} reload={()=>{}}/>);
 expect(screen.getByText('검증고등학교')).toBeInTheDocument();
 await u.click(screen.getByRole('button',{name:'학교·학년 변경'}));await u.click(screen.getByRole('button',{name:'학교 해당 없음'}));
 await u.selectOptions(screen.getByLabelText('현재 상태'),'retaker');
 await u.click(screen.getByRole('button',{name:'현재 상태 저장'}));
 await waitFor(()=>expect(saveMyProfile).toHaveBeenCalledWith({},'owner',{...empty,academic_status:'retaker'}));
});
