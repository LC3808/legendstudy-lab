// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi} from 'vitest';
import {EssayHistory} from './essay-history';
vi.mock('next/navigation',()=>({useRouter:()=>({back:vi.fn(),replace:vi.fn()})}));
vi.mock('@/components/auth-context',()=>({useAuth:()=>({status:'authenticated',user:{id:'owner'},client:{auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})}}})}));
vi.mock('@/components/credit-balance',()=>({useCreditSummary:()=>({state:{status:'ready',value:{spendable:4}}})}));
vi.mock('@/lib/my/essay-dashboard',async original=>({...await original<typeof import('@/lib/my/essay-dashboard')>(),readEssayDashboard:async()=>['인문','경제·경영','과학'].map((type,i)=>({id:String(i),source:'essay',question:'문제'+i,university:'대학'+i,year:2025+i,essayType:type,at:'2026-10-09',rewrite:false,evaluations:[{id:'e'+i,status:i===1?'failed':'completed',valid:true,at:'2026-10-09',completedAt:null}]})),readMathDashboard:async()=>[]}));
it('filters university, year, separate essay types and state; reset restores records without Credit transactions',async()=>{
 render(<EssayHistory/>);const u=userEvent.setup();await screen.findByText('대학0 · 문제0');
 await u.click(screen.getByText('기록 필터'));
 await u.selectOptions(screen.getByLabelText('대학',{exact:true}),'대학1');expect(screen.queryByText('대학0 · 문제0')).toBeNull();
 await u.selectOptions(screen.getByLabelText('학년도',{exact:true}),'2026');expect(screen.getByText('대학1 · 문제1')).toBeVisible();
 await u.selectOptions(screen.getByLabelText('논술 유형',{exact:true}),'경제·경영');expect(screen.getByText('대학1 · 문제1')).toBeVisible();
 await u.selectOptions(screen.getByLabelText('평가 상태',{exact:true}),'completed');expect(screen.getByText('선택한 조건의 첨삭 기록이 없습니다.')).toBeVisible();
 await u.click(screen.getByRole('button',{name:'필터 초기화'}));expect(screen.getAllByRole('button',{name:'답안·평가 보기'})).toHaveLength(3);
 expect(screen.getByText('남은 첨삭권 4개 ·')).toBeVisible();expect(screen.queryByRole('table')).toBeNull();
});
