// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn()}));
vi.mock('./admin-surface',async importOriginal=>({...await importOriginal<typeof import('./admin-surface')>(),useAdminQuery:mocks.query}));
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
