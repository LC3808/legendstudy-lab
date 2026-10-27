// @vitest-environment jsdom
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {EssayBetaCredit,parseBetaCredit} from './essay-beta-credit';
const m=vi.hoisted(()=>({rpc:vi.fn(),session:vi.fn(),subscribe:vi.fn()}));
vi.mock('@/lib/browser-auth-client',()=>({getBrowserAuthClient:()=>({rpc:m.rpc,auth:{getSession:m.session,onAuthStateChange:m.subscribe}})}));
const active={version:'essay-beta-credit-v1',active:true,grant_id:'fixture',day:'2026-10-27',available:2,expires_at:new Date(Date.now()+3600000).toISOString()};
beforeEach(()=>{m.rpc.mockReset();m.session.mockReset();m.session.mockResolvedValue({data:{session:{user:{id:'one'}}}});m.subscribe.mockReturnValue({data:{subscription:{unsubscribe:vi.fn()}}});});
afterEach(cleanup);
it('does not claim when signed out',async()=>{m.session.mockResolvedValue({data:{session:null}});render(<EssayBetaCredit/>);await waitFor(()=>expect(m.session).toHaveBeenCalled());expect(m.rpc).not.toHaveBeenCalled();});
it('uses server balance and refreshes shared credit after a grant',async()=>{m.rpc.mockResolvedValue({data:active});const listener=vi.fn();window.addEventListener('legendstudy:credit-refresh',listener);render(<EssayBetaCredit/>);await screen.findByText(/오늘 남은 무료 첨삭권 2개/);expect(m.rpc).toHaveBeenCalledTimes(1);expect(m.rpc).toHaveBeenCalledWith('essay_beta_daily_claim');expect(listener).toHaveBeenCalledTimes(1);window.removeEventListener('legendstudy:credit-refresh',listener);});
it('refreshes after spend without a notification loop',async()=>{m.rpc.mockResolvedValue({data:active});render(<EssayBetaCredit/>);await screen.findByText(/2개$/);m.rpc.mockResolvedValue({data:{...active,available:1}});act(()=>window.dispatchEvent(new Event('legendstudy:credit-refresh')));await screen.findByText(/1개$/);expect(m.rpc).toHaveBeenCalledTimes(2);});
it.each([{data:{version:'essay-beta-credit-v1',active:false}},{error:{code:'PGRST202'}}])('inactive or not deployed is hidden',async response=>{m.rpc.mockResolvedValue(response);const {container}=render(<EssayBetaCredit/>);await waitFor(()=>expect(m.rpc).toHaveBeenCalled());expect(container).toBeEmptyDOMElement();});
it('failure does not invent a grant',async()=>{m.rpc.mockResolvedValue({error:{code:'503'}});render(<EssayBetaCredit/>);await screen.findByText(/베타 첨삭권을 확인하지 못했습니다/);expect(screen.queryByText(/오늘 남은/)).toBeNull();});
it('does not reveal an old account response',async()=>{m.session.mockResolvedValueOnce({data:{session:{user:{id:'one'}}}}).mockResolvedValue({data:{session:{user:{id:'two'}}}});m.rpc.mockResolvedValue({data:active});const {container}=render(<EssayBetaCredit/>);await waitFor(()=>expect(m.session).toHaveBeenCalledTimes(2));expect(container).toBeEmptyDOMElement();});
it('rejects malformed or inflated balances',()=>{for(const available of [-1,3,1.5,'2'])expect(parseBetaCredit({...active,available})).toBeNull();expect(parseBetaCredit({...active,expires_at:'bad'})).toBeNull();});
