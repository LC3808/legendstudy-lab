// @vitest-environment jsdom
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,it,expect,vi} from 'vitest';
import {EssayHistory} from './essay-history';
vi.mock('./essay-dashboard',()=>({RecordDetail:({row}:{row:{id:string}})=><p>저장된 결과 {row.id}</p>}));
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(window.location.search),useRouter:()=>({back:vi.fn(),replace:vi.fn()})}));
vi.mock('@/components/auth-context',()=>({useAuth:()=>({status:'authenticated',user:{id:'owner'},client:{auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})}}})}));
vi.mock('@/components/credit-balance',()=>({useCreditSummary:()=>({state:{status:'ready',value:{spendable:4}}})}));
vi.mock('@/lib/my/essay-dashboard',async original=>({...await original<typeof import('@/lib/my/essay-dashboard')>(),readEssayDashboard:async()=>['인문','경제·경영','과학'].map((type,i)=>({id:String(i),examId:'exam-'+i,source:'essay',question:'문제'+i,university:'대학'+i,year:2025+i,essayType:type,at:'2026-10-09',rewrite:false,evaluations:[{id:'e'+i,status:i===1?'failed':'completed',valid:true,at:'2026-10-09',completedAt:null}]})),readMathDashboard:async()=>[]}));
it('filters university, year, separate essay types and state; reset restores records without 크레딧 transactions',async()=>{
 render(<EssayHistory/>);const u=userEvent.setup();await screen.findByRole('link',{name:/대학0.*문제0/});
 expect(screen.getByText('검색').closest('details')).toHaveAttribute('open');
 expect(screen.queryByRole('button',{name:'필터 초기화'})).toBeNull();
 await u.selectOptions(screen.getByLabelText('대학',{exact:true}),'대학1');expect(screen.queryByRole('link',{name:/대학0.*문제0/})).toBeNull();
 await u.selectOptions(screen.getByLabelText('학년도',{exact:true}),'2026');expect(screen.getByRole('link',{name:/대학1.*문제1/})).toBeVisible();
 await u.selectOptions(screen.getByLabelText('논술 유형',{exact:true}),'경제·경영');expect(screen.getByRole('link',{name:/대학1.*문제1/})).toBeVisible();
 await u.selectOptions(screen.getByLabelText('평가 상태',{exact:true}),'completed');expect(screen.getByText('선택한 조건의 첨삭 기록이 없습니다.')).toBeVisible();
 for(const label of ['대학','학년도','논술 유형','평가 상태'])await u.selectOptions(screen.getByLabelText(label,{exact:true}),'');expect(screen.getAllByRole('link',{name:/결과 보기 →/})).toHaveLength(3);
 expect(screen.queryByText('나의 논술 성장')).not.toBeNull();expect(screen.queryByRole('table')).toBeNull();
});

afterEach(()=>{cleanup();window.history.replaceState({},'', '/');});
it('exam query scopes all records and hides other exams growth',async()=>{
 window.history.replaceState({},'', '/my/essays/?exam=exam-1');render(<EssayHistory/>);
 await screen.findByRole('link',{name:/대학1.*문제1/});
 expect(screen.queryByRole('link',{name:/대학0.*문제0/})).toBeNull();
 expect(screen.queryByRole('link',{name:/대학2.*문제2/})).toBeNull();
 expect(screen.queryByText('평가요소별 성장 변화')).toBeNull();
});

it('opens the exact record alongside the list and retains its bookmark URL',async()=>{
 render(<EssayHistory/>);const u=userEvent.setup();await u.click(await screen.findByRole('link',{name:/대학1.*문제1/}));
 expect(await screen.findByText('저장된 결과 1')).toBeVisible();expect(window.location.search).toBe('?source=essay&id=1');
 await u.click(screen.getByRole('button',{name:'목록으로 돌아가기'}));expect(screen.queryByText('저장된 결과 1')).toBeNull();
 expect(screen.queryByRole('searchbox')).toBeNull();
});
it('selects the exact bookmarked result without creating an evaluation',async()=>{
 render(<EssayHistory initialSource="essay" initialId="2"/>);expect(await screen.findByText('저장된 결과 2')).toBeVisible();expect(screen.queryByText('저장된 결과 1')).toBeNull();
});

it('collapses records without hiding the selected result and exposes export controls',async()=>{
 render(<EssayHistory initialSource="essay" initialId="2"/>);const u=userEvent.setup();await screen.findByText('저장된 결과 2');
 await u.click(screen.getByRole('button',{name:'시험 목록 접기'}));
 expect(screen.queryByRole('link',{name:/대학0.*문제0/})).toBeNull();expect(screen.getByText('저장된 결과 2')).toBeVisible();
 expect(screen.getByRole('button',{name:'인쇄 / PDF 저장'})).toBeVisible();expect(screen.getByRole('button',{name:'공유'})).toBeVisible();
 await u.click(screen.getByRole('button',{name:'시험 목록 펼치기'}));expect(screen.getByRole('link',{name:/대학0.*문제0/})).toBeVisible();
});
