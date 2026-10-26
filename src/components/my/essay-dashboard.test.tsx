// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi,beforeEach} from 'vitest';
import {EssayDashboard} from './essay-dashboard';
const state=vi.hoisted(()=>({owner:'a',fail:false,history:vi.fn().mockResolvedValue([])}));
vi.mock('@/components/auth-context',()=>({useAuth:()=>({status:'authenticated',user:{id:state.owner},client:{auth:{getSession:async()=>({data:{session:{user:{id:state.owner}}}})}}})}));
vi.mock('./essay-history-growth',()=>({EssayGrowth:()=> <section>나의 논술 성장</section>,readEssayGrowth:async()=>[]}));
vi.mock('./dashboard',()=>({Usage:()=> <p>無料 크레딧 3</p>}));
vi.mock('@/lib/my/data',()=>({assertOwner:async()=>{},readHistory:state.history}));
vi.mock('@/lib/my/essay-dashboard',async original=>({...await original<typeof import('@/lib/my/essay-dashboard')>(),readEssayDashboard:async()=>{if(state.fail)throw Error('READ_FAILED');return [];},readMathDashboard:async()=>[]}));
beforeEach(()=>{state.owner='a';state.fail=false;});
it('shows authenticated empty structure with a start CTA and PDF-only sharing',async()=>{
 const print=vi.spyOn(window,'print').mockImplementation(()=>{});render(<EssayDashboard/>);
 expect(await screen.findByText('아직 첨삭 기록이 없습니다.')).toBeVisible();
 expect(screen.getByRole('link',{name:'논술 LAB 시작하기 →'})).toHaveAttribute('href','/essay-lab');
 expect(screen.queryByRole('link',{name:'마이페이지'})).toBeNull();
 expect(state.history).not.toHaveBeenCalled();
 const u=userEvent.setup();await u.click(screen.getByRole('button',{name:'공유'}));
 expect(screen.getByRole('button',{name:'논술 LAB 주소 복사'})).toBeVisible();
 expect(screen.getByRole('button',{name:'이미지 저장'})).toBeVisible();
 await u.click(screen.getByRole('button',{name:'인쇄 / PDF 저장'}));expect(print).toHaveBeenCalledOnce();
});
it('does not claim no records when a source failed',async()=>{
 state.fail=true;render(<EssayDashboard/>);expect(await screen.findByRole('alert')).toBeVisible();
 expect(screen.queryByText('아직 첨삭 기록이 없습니다.')).toBeNull();
});

vi.mock('next/navigation',()=>({useRouter:()=>({back:vi.fn(),replace:vi.fn()})}));
