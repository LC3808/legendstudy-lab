// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {EssayHistory} from './essay-history';
const f=vi.hoisted(()=>({client:{auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})}},rows:[] as ReturnType<typeof row>[],read:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({back:vi.fn()})}));
vi.mock('@/components/auth-context',()=>({useAuth:()=>({status:'authenticated',user:{id:'owner'},client:f.client})}));
vi.mock('@/components/credit-balance',()=>({useCreditSummary:()=>({state:{status:'ready',value:{spendable:0}}})}));
vi.mock('./essay-dashboard',()=>({RecordDetail:()=> <p>저장된 결과</p>}));
vi.mock('@/lib/my/essay-dashboard',async original=>({...await original<typeof import('@/lib/my/essay-dashboard')>(),readEssayDashboard:async()=>{f.read();return [...f.rows];},readMathDashboard:async()=>[]}));
const row=(id:string)=>({id,source:'exam',question:'시험'+id,university:'대학',at:'2026-10-23',evaluations:[{id,status:'completed',valid:true,at:'2026-10-23'}]});
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('refreshes on return, matching completion and focus; unrelated owner cannot trigger reload',async()=>{
 f.rows=[row('1')];render(<EssayHistory/>);
 fireEvent.click(await screen.findByRole('button',{name:/시험1.*결과 보기/}));
 f.rows.push(row('2'));fireEvent.click(screen.getByRole('button',{name:'나의 첨삭 기록'}));
 await screen.findByRole('button',{name:/시험2.*결과 보기/});
 const n=f.read.mock.calls.length;
 act(()=>window.dispatchEvent(new CustomEvent('essay-history-changed',{detail:{owner:'other'}})));
 expect(f.read).toHaveBeenCalledTimes(n);
 f.rows.push(row('3'));act(()=>window.dispatchEvent(new CustomEvent('essay-history-changed',{detail:{owner:'owner'}})));
 await screen.findByRole('button',{name:/시험3.*결과 보기/});
 f.rows.push(row('4'));fireEvent.focus(window);
 await screen.findByRole('button',{name:/시험4.*결과 보기/});
 await waitFor(()=>expect(screen.getAllByRole('button',{name:/결과 보기/})).toHaveLength(4));
});
