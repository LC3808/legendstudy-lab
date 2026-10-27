// @vitest-environment jsdom
import {render,screen,waitFor,within} from '@testing-library/react';
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
 const yearField=screen.getByLabelText('입학학년도');await user.clear(yearField);await user.type(yearField,'2027');await user.type(screen.getByLabelText('지원 학과·모집단위'),'경영학과');await user.click(screen.getByRole('radio',{name:'수시'}));await user.type(screen.getByLabelText('전형 이름'),'논술전형');await user.click(screen.getByRole('button',{name:'저장'}));
 await screen.findByRole('alert');await user.click(screen.getByRole('button',{name:'저장'}));await waitFor(()=>expect(saveApplication).toHaveBeenCalledTimes(2));
 const [first,second]=vi.mocked(saveApplication).mock.calls;expect(first[2]).toMatchObject({university:'u1',division:'경영학과',year:2027});expect(first[3]).toBe(second[3]);
});
it('shows read failure rather than an empty application list',async()=>{
 vi.mocked(readApplicationPage).mockRejectedValueOnce(new Error('denied'));render(<ApplicationsPanel/>);await screen.findByRole('alert');expect(screen.queryByText('등록된 지원 내역이 없습니다.')).toBeNull();
});
it('appends a correction without changing the original event',async()=>{
 const user=userEvent.setup();vi.mocked(readApplicationPage).mockResolvedValue({offset:0,has_more:false,items:[{id:'app1',admission_year:2027,university_id:'u1',university_name_snapshot:'테스트대학교',intended_division:'경영학과',admission_type:'수시',admission_name:'논술',revision:1,latest_event:null}]});
 vi.mocked(readApplicationEvents).mockResolvedValue({offset:0,has_more:false,items:[{id:'old',kind:'accepted',recorded_at:'2026-10-08T00:00:00Z',occurred_at:null}]});vi.mocked(addApplicationEvent).mockResolvedValue('new');
 render(<ApplicationsPanel/>);await user.click(await screen.findByLabelText('테스트대학교 지원 내역 관리'));await user.click(await screen.findByRole('button',{name:'이력 보기'}));await user.click(await screen.findByRole('button',{name:'정정'}));await user.selectOptions(screen.getByLabelText('진행·결과'),'rejected');await user.click(screen.getByRole('button',{name:'기록 저장'}));
 await waitFor(()=>expect(addApplicationEvent).toHaveBeenCalled());expect(vi.mocked(addApplicationEvent).mock.calls[0].slice(2,6)).toEqual(['app1','rejected',null,'old']);
});
it('filters the latest year across server pages without hiding older years',async()=>{
 const user=userEvent.setup();
 const base={university_id:'u1',intended_division:'경영학과',admission_name:'논술',revision:1,latest_event:null};
 vi.mocked(readApplicationPage).mockImplementation(async(_client,_owner,offset)=>offset===0?{offset:0,has_more:true,items:[{...base,id:'old',admission_year:2026,university_name_snapshot:'지난대학교',admission_type:'수시'}]}:{offset:25,has_more:false,items:[{...base,id:'new',admission_year:2027,university_name_snapshot:'최신대학교',admission_type:'정시'}]});
 render(<ApplicationsPanel/>);
 await screen.findByText('최신대학교 · 경영학과');
 expect(screen.queryByText('지난대학교 · 경영학과')).toBeNull();
 await user.selectOptions(screen.getByLabelText('학년도'),'2026');
 expect(screen.getByText('지난대학교 · 경영학과')).toBeTruthy();
 expect(screen.queryByText('최신대학교 · 경영학과')).toBeNull();
 await user.selectOptions(screen.getByLabelText('모집 구분'),'정시');
 expect(screen.queryByText('지난대학교 · 경영학과')).toBeNull();
});

it('keeps stage pass separate from final acceptance and exposes compact actions',async()=>{
 const user=userEvent.setup();
 const base={admission_year:2027,university_id:'u1',university_name_snapshot:'긴이름대학교',intended_division:'국제경영경제융합학과',admission_type:'수시',admission_name:'학교장추천',revision:1};
 vi.mocked(readApplicationPage).mockResolvedValue({offset:0,has_more:false,items:['stage_pass','accepted','registered'].map((kind,i)=>({...base,id:String(i),latest_event:{id:'e'+i,kind:kind as 'stage_pass'|'accepted'|'registered',occurred_at:null,recorded_at:'2026-10-27T00:00:00Z'}}))});
 render(<ApplicationsPanel/>);
 expect(await screen.findByText('최종 합격 1건')).toBeTruthy();
 expect(screen.getByText('1단계 합격 1건')).toBeTruthy();
 const menu=screen.getAllByLabelText('긴이름대학교 지원 내역 관리')[0];
 expect(menu.closest('details')?.open).toBe(false);
 await user.click(menu);
 expect(menu.closest('details')?.open).toBe(true);
 expect(within(menu.closest('details')!).getByRole('button',{name:'지원 내역 변경'})).toBeTruthy();
 await user.keyboard('{Escape}');
 expect(menu.closest('details')?.open).toBe(false);
});
