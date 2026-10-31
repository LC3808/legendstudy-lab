// @vitest-environment jsdom
import {act,fireEvent,cleanup,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {EssayBetaCredit,parseBetaCredit} from './essay-beta-credit';
const m=vi.hoisted(()=>({rpc:vi.fn(),session:vi.fn(),subscribe:vi.fn()}));
vi.mock('@/lib/browser-auth-client',()=>({getBrowserAuthClient:()=>({rpc:m.rpc,auth:{getSession:m.session,onAuthStateChange:m.subscribe}})}));
const active={version:'essay-beta-credit-v2',active:true,grant_id:'fixture',day:'2026-10-27',available:1,status:'active',ends_at:'2026-11-10T15:00:00Z',campaign_id:'campaign',policy_version:'daily-v2',notice_seen:true,notice_id:'notice',expires_at:new Date(Date.now()+3600000).toISOString()};
beforeEach(()=>{m.rpc.mockReset();m.session.mockReset();m.session.mockResolvedValue({data:{session:{user:{id:'one'}}}});m.subscribe.mockReturnValue({data:{subscription:{unsubscribe:vi.fn()}}});});
afterEach(cleanup);
it('does not claim when signed out',async()=>{m.session.mockResolvedValue({data:{session:null}});render(<EssayBetaCredit/>);await waitFor(()=>expect(m.session).toHaveBeenCalled());expect(m.rpc).not.toHaveBeenCalled();});
it('uses server balance and refreshes shared credit after a grant',async()=>{m.rpc.mockResolvedValue({data:active});const listener=vi.fn();window.addEventListener('legendstudy:credit-refresh',listener);render(<EssayBetaCredit/>);await screen.findByText(/오늘의 무료 첨삭 · 1회 남음/);expect(m.rpc).toHaveBeenCalledTimes(1);expect(m.rpc).toHaveBeenCalledWith('essay_beta_daily_claim_v2');expect(listener).toHaveBeenCalledTimes(1);window.removeEventListener('legendstudy:credit-refresh',listener);});
it('refreshes after spend without a notification loop',async()=>{m.rpc.mockResolvedValue({data:active});render(<EssayBetaCredit/>);await screen.findByText(/1회 남음$/);m.rpc.mockResolvedValue({data:{...active,available:0}});act(()=>window.dispatchEvent(new Event('legendstudy:credit-refresh')));await screen.findByText(/오늘의 무료 첨삭을 모두 사용했습니다/);expect(m.rpc).toHaveBeenCalledTimes(2);});
it.each([{data:{version:'essay-beta-credit-v2',active:false,status:'inactive'}},{error:{code:'PGRST202'}}])('inactive or not deployed is hidden',async response=>{m.rpc.mockResolvedValue(response);const {container}=render(<EssayBetaCredit/>);await waitFor(()=>expect(m.rpc).toHaveBeenCalled());expect(container).toBeEmptyDOMElement();});
it('failure does not invent a grant',async()=>{m.rpc.mockResolvedValue({error:{code:'503'}});render(<EssayBetaCredit/>);await screen.findByText(/베타 첨삭권을 확인하지 못했습니다/);expect(screen.queryByText(/오늘 남은/)).toBeNull();});
it('does not reveal an old account response',async()=>{m.session.mockResolvedValueOnce({data:{session:{user:{id:'one'}}}}).mockResolvedValue({data:{session:{user:{id:'two'}}}});m.rpc.mockResolvedValue({data:active});const {container}=render(<EssayBetaCredit/>);await waitFor(()=>expect(m.session).toHaveBeenCalledTimes(2));expect(container).toBeEmptyDOMElement();});
it('rejects malformed or inflated balances',()=>{for(const available of [-1,2,3,1.5,'1'])expect(parseBetaCredit({...active,available})).toBeNull();expect(parseBetaCredit({...active,expires_at:'bad'})).toBeNull();});

it('ended campaign is explicit, does not keep a midnight refresh',async()=>{
 m.rpc.mockResolvedValue({data:{version:'essay-beta-credit-v2',active:false,status:'ended',ends_at:active.ends_at}});
 render(<EssayBetaCredit/>);await screen.findByText('베타 무료 첨삭 제공이 종료되었습니다.');expect(m.rpc).toHaveBeenCalledTimes(1);
});
it('first entry policy once, server acknowledgement and notice link',async()=>{
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:()=>{}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:()=>{}});
 const show=vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});
 const close=vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;this.dispatchEvent(new Event('close'));});
 m.rpc.mockImplementation((name:string)=>Promise.resolve({data:name==='essay_beta_notice_ack'?null:{...active,notice_seen:false}}));
 render(<EssayBetaCredit/>);await screen.findByRole('dialog');
 expect(screen.getByText(/베타는 2026년 11월 10일까지/)).toBeInTheDocument();
 expect(screen.getByText('베타 공지 다시 보기')).toHaveAttribute('href','/notices/notice');
 fireEvent.click(screen.getByRole('button',{name:'확인'}));
 await waitFor(()=>expect(m.rpc).toHaveBeenCalledWith('essay_beta_notice_ack',{p_campaign:'campaign'}));
 act(()=>window.dispatchEvent(new Event('legendstudy:credit-refresh')));
 await waitFor(()=>expect(m.rpc).toHaveBeenCalledTimes(3));
 expect(screen.queryByRole('dialog')).toBeNull();expect(show).toHaveBeenCalledTimes(1);
 show.mockRestore();close.mockRestore();
});

it('final beta day never promises a next free day',async()=>{
 m.rpc.mockResolvedValue({data:{...active,available:0,expires_at:active.ends_at}});
 render(<EssayBetaCredit/>);await screen.findByText('오늘의 무료 첨삭을 모두 사용했습니다.');
 expect(screen.queryByText(/다음 이용: 내일/)).toBeNull();
});
