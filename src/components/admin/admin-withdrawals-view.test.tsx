// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {listFixture,detailFixture,requestId} from '@/test/withdrawal-fixtures';
import {parseWithdrawalList,parseWithdrawalDetail} from '@/lib/admin/withdrawals';
const mocks=vi.hoisted(()=>({query:vi.fn(),reload:vi.fn()}));
vi.mock('./admin-surface',async orig=>({...await orig<typeof import('./admin-surface')>(),useAdminQuery:mocks.query}));
vi.mock('./admin-members-view',()=>({AdminMembersView:()=> <p>기존 회원 목록</p>}));
import {AdminMembersWorkspace,AdminWithdrawalsView,WithdrawalDetailPanel} from './admin-withdrawals-view';
afterEach(cleanup);
beforeEach(()=>{mocks.query.mockReset();mocks.reload.mockReset();mocks.query.mockImplementation((_loader:unknown,key:string)=>({reload:mocks.reload,state:{status:'ready',data:key.startsWith('withdrawal:')?parseWithdrawalDetail(detailFixture):parseWithdrawalList(listFixture)}}));});
describe('withdrawal admin view',()=>{
 it('keeps existing member page as default and switches without rebuilding it',()=>{render(<AdminMembersWorkspace/>);expect(screen.getByText('기존 회원 목록')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'탈퇴 관리'}));expect(screen.getByRole('heading',{name:'탈퇴 관리'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'전체 회원'}));expect(screen.getByText('기존 회원 목록')).toBeInTheDocument();});
 it('shows read-only detail and closes it',()=>{render(<AdminWithdrawalsView/>);fireEvent.click(screen.getByRole('button',{name:/요청 상세$/}));expect(screen.getByText('누적 공부 시간')).toBeInTheDocument();expect(screen.getByText('미집계')).toBeInTheDocument();expect(screen.queryByRole('button',{name:/삭제 실행|강제 삭제|탈퇴 취소/})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'상세 닫기'}));expect(screen.queryByText('누적 공부 시간')).not.toBeInTheDocument();});
 it('applies filters, order and search then resets',()=>{render(<AdminWithdrawalsView/>);fireEvent.change(screen.getByLabelText('처리 상태'),{target:{value:'failed'}});fireEvent.change(screen.getByLabelText('정렬'),{target:{value:'oldest'}});fireEvent.change(screen.getByLabelText('내부 사용자 ID'),{target:{value:'003'}});fireEvent.click(screen.getByRole('button',{name:/^조회$/}));expect(mocks.query.mock.lastCall?.[1]).toContain('failed');expect(mocks.query.mock.lastCall?.[1]).toContain('oldest');fireEvent.click(screen.getByRole('button',{name:'초기화'}));expect(screen.getByLabelText('내부 사용자 ID')).toHaveValue('');});
 it('uses server total for pagination and clears selected details',()=>{mocks.query.mockReturnValue({reload:mocks.reload,state:{status:'ready',data:parseWithdrawalList({...listFixture,total:23,next_cursor:{as_of:listFixture.as_of,requested_at:listFixture.as_of,request_id:requestId}})}});render(<AdminWithdrawalsView/>);expect(screen.getByText('1페이지')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'다음'}));expect(mocks.query.mock.lastCall?.[1]).toContain(requestId);});
 for(const [kind,title] of [['UNAUTHORIZED','운영자 권한이 없습니다'],['NOT_INSTALLED','운영 조회 기능이 아직 연결되지 않았습니다'],['NETWORK','연결이 원활하지 않습니다']]){
  it(`does not replace ${kind} with zero`,()=>{mocks.query.mockReturnValue({reload:mocks.reload,state:{status:'error',kind}});render(<AdminWithdrawalsView/>);expect(screen.getByText(title)).toBeInTheDocument();expect(screen.queryByText('0건')).not.toBeInTheDocument();});
 }
 it('distinguishes empty from a failed query',()=>{mocks.query.mockReturnValue({reload:mocks.reload,state:{status:'ready',data:parseWithdrawalList({...listFixture,total:0,items:[]})}});render(<AdminWithdrawalsView/>);expect(screen.getByText('조건에 맞는 탈퇴 요청이 없습니다.')).toBeInTheDocument();});
 for(const status of ['ERASING','ERASED','CANCELLED']){
  it(`does not display personal metrics for ${status}`,()=>{mocks.query.mockReturnValue({reload:mocks.reload,state:{status:'ready',data:parseWithdrawalDetail({...detailFixture,state:status,identity:null,activity:null})}});render(<WithdrawalDetailPanel requestId={requestId} onClose={()=>{}}/>);expect(screen.queryByText('누적 공부 시간')).not.toBeInTheDocument();expect(screen.queryByText('내부 사용자 ID')).not.toBeInTheDocument();});
 }
});

it('renders synthetic list/detail for local visual inspection',()=>{
 const view=render(<AdminWithdrawalsView/>);fireEvent.click(screen.getByRole('button',{name:/요청 상세$/}));
 expect(screen.getByText('삭제 처리 현황')).toBeInTheDocument();
 const output=process.env.TASK05_VISUAL_DIR;
 if(output){
  fs.mkdirSync(output,{recursive:true});
  const css=['src/app/globals.css','src/components/admin/member-dashboard.css','src/components/admin/withdrawals.css'].map(f=>fs.readFileSync(f,'utf8').replace(/^@import.*$/gm,'')).join('\n');
  fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}body{background:#e9efed;padding:16px;max-width:1240px;margin:auto}*{box-sizing:border-box}</style><body><h1>탈퇴 관리 · 합성 TEST</h1>${view.container.innerHTML}<script>window.onload=()=>{document.body.dataset.overflow=String(document.documentElement.scrollWidth>innerWidth)}</script></body></html>`);
 }
});
it('can disable only the new tab without removing existing members',()=>{
 vi.stubEnv('NEXT_PUBLIC_ADMIN_WITHDRAWALS_ENABLED','false');
 render(<AdminMembersWorkspace/>);expect(screen.getByText('기존 회원 목록')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'탈퇴 관리'})).toBeNull();vi.unstubAllEnvs();
});
