// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn()}));
vi.mock('./admin-surface',async importOriginal=>({...await importOriginal<typeof import('./admin-surface')>(),useAdminQuery:mocks.query}));
vi.mock('./admin-lab-operations',()=>({AdminLabOperations:()=>null}));
vi.mock('./member-recent-activity',()=>({MemberRecentActivity:()=>null}));
vi.mock('./member-university-activity',()=>({MemberUniversityActivity:()=>null}));
import {AdminMemberDetailPanel} from './admin-members-view';
afterEach(cleanup);
describe('independent member report availability',()=>{
 for(const legacy of [{status:'error',kind:'NOT_INSTALLED'},{status:'loading'}]) {
  it(`keeps authorized Student 360 readable when legacy detail is ${legacy.status}`,()=>{
   mocks.query.mockImplementation((_query:unknown,key:string)=>({reload:vi.fn(),state:key.startsWith('student360:')?{status:'success',data:{status:null,study:{today_ms:0,week_ms:0,last30_ms:0,daily7:[]},applications:{items:[],has_more:false},essay:{sessions:[],hasMoreSessions:false}}}:legacy}));
   render(<AdminMemberDetailPanel accountId="test-student"/>);
   expect(screen.getByText('공부 시간·지원 현황')).toBeInTheDocument();
   expect(screen.getByText('등록된 지원 내역이 없습니다.')).toBeInTheDocument();
   expect(screen.getAllByText(legacy.status==='loading'?'회원 정보를 불러오는 중입니다':'운영 조회 기능이 아직 연결되지 않았습니다').length).toBeGreaterThan(0);
  });
 }
});
it('opens only the UUID-linked student without requiring a matching list page',async()=>{
 const {AdminMembersView}=await import('./admin-members-view');
 const id='00000000-0000-4000-8000-000000000012';
 window.history.replaceState(null,'',`/admin/members/?member=${id}`);
 mocks.query.mockImplementation((_query:unknown,key:string)=>({reload:vi.fn(),state:key.startsWith('detail:')?{status:'loading'}:(key.startsWith('student360:')||key.startsWith('credit:'))?{status:'loading'}:{status:'ready',data:{total:0,filteredTotal:0,items:[]}}}));
 render(<AdminMembersView/>);
 expect(await screen.findByRole('region',{name:'연결된 학생 상세'})).toBeInTheDocument();
 expect(mocks.query.mock.calls.some(([,key])=>key===`detail:${id}`)).toBe(true);
 window.history.replaceState(null,'','/');
});
