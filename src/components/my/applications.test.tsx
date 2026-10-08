// @vitest-environment jsdom
import {render,screen,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import userEvent from '@testing-library/user-event';
import {ApplicationsPanel} from './applications';
import {addApplicationEvent,saveApplication,readApplicationPage,readApplicationEvents} from '@/lib/my/foundation';
const owner={id:'a'};
const mockedClient={auth:{getSession:async()=>({data:{session:{user:owner}}})}};
vi.mock('@/components/auth-context',()=>({useAuth:()=>({client:mockedClient,user:owner,status:'authenticated'})}));
vi.mock('@/lib/my/data',()=>({assertOwner:async()=>{},searchUniversities:async()=>[{id:'u1',name:'테스트대학교'}]}));
vi.mock('@/lib/my/foundation',async importOriginal=>({...await importOriginal<typeof import('@/lib/my/foundation')>(),readApplicationPage:vi.fn(),readApplicationEvents:vi.fn(),saveApplication:vi.fn(),addApplicationEvent:vi.fn(),deleteApplication:vi.fn()}));
beforeEach(()=>{vi.mocked(readApplicationPage).mockResolvedValue({items:[],has_more:false,offset:0});vi.mocked(saveApplication).mockResolvedValue('app-1');});
it('adds an explicit application and retries an ambiguous save with the same key',async()=>{
 const user=userEvent.setup();vi.mocked(saveApplication).mockRejectedValueOnce(new Error('network'));
 render(<ApplicationsPanel/>);await screen.findByText('등록된 지원 내역이 없습니다.');await user.click(screen.getByRole('button',{name:'지원 내역 추가'}));
 await user.type(screen.getByLabelText('지원 대학 검색'),'테스트');await user.click(screen.getByRole('button',{name:'검색'}));await user.click(await screen.findByRole('button',{name:'선택'}));
 await user.type(screen.getByLabelText('입학 연도'),'2027');await user.type(screen.getByLabelText('지원 학과·모집단위'),'경영학과');await user.type(screen.getByLabelText('모집 구분'),'수시');await user.type(screen.getByLabelText('전형 이름'),'논술전형');await user.click(screen.getByRole('button',{name:'저장'}));
 await screen.findByRole('alert');await user.click(screen.getByRole('button',{name:'저장'}));await waitFor(()=>expect(saveApplication).toHaveBeenCalledTimes(2));
 const [first,second]=vi.mocked(saveApplication).mock.calls;expect(first[2]).toMatchObject({university:'u1',division:'경영학과',year:2027});expect(first[3]).toBe(second[3]);
});
it('shows read failure rather than an empty application list',async()=>{
 vi.mocked(readApplicationPage).mockRejectedValueOnce(new Error('denied'));render(<ApplicationsPanel/>);await screen.findByRole('alert');expect(screen.queryByText('등록된 지원 내역이 없습니다.')).toBeNull();
});
it('appends a correction without changing the original event',async()=>{
 const user=userEvent.setup();vi.mocked(readApplicationPage).mockResolvedValue({offset:0,has_more:false,items:[{id:'app1',admission_year:2027,university_id:'u1',university_name_snapshot:'테스트대학교',intended_division:'경영학과',admission_type:'수시',admission_name:'논술',revision:1,latest_event:null}]});
 vi.mocked(readApplicationEvents).mockResolvedValue({offset:0,has_more:false,items:[{id:'old',kind:'accepted',recorded_at:'2026-10-08T00:00:00Z',occurred_at:null}]});vi.mocked(addApplicationEvent).mockResolvedValue('new');
 render(<ApplicationsPanel/>);await user.click(await screen.findByRole('button',{name:'이력 보기'}));await user.click(await screen.findByRole('button',{name:'정정'}));await user.selectOptions(screen.getByLabelText('진행·결과'),'rejected');await user.click(screen.getByRole('button',{name:'기록 저장'}));
 await waitFor(()=>expect(addApplicationEvent).toHaveBeenCalled());expect(vi.mocked(addApplicationEvent).mock.calls[0].slice(2,6)).toEqual(['app1','rejected',null,'old']);
});
