// @vitest-environment jsdom
import {act,render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {EssayRuntimeEntry} from './essay-runtime-entry';
const state=vi.hoisted(()=>({auth:{} as Record<string,unknown>}));
vi.mock('@/components/auth-context',()=>({useAuth:()=>state.auth}));
vi.mock('@/components/math-release/student-route',()=>({MathStudentRoute:()=> <div>math-workspace</div>}));
const client={auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})}};
function login(id='A'){state.auth={status:'authenticated',user:{id},client};}
const response=(enabled:boolean)=>Response.json({version:'essay-web-v1',types:{math:enabled}});
afterEach(()=>vi.unstubAllGlobals());
describe('runtime admission entry',()=>{
 it('requires login and preserves the canonical next destination',()=>{
  state.auth={status:'signed-out',user:null};render(<EssayRuntimeEntry workspace/>);
  expect(screen.getByRole('link',{name:'로그인'})).toHaveAttribute('href','/login?next=%2Fmath%2F');
  expect(screen.queryByText('math-workspace')).not.toBeInTheDocument();
 });
 it('distinguishes unavailable from transport error and mounts only admitted Math',async()=>{
  login();vi.stubGlobal('fetch',vi.fn(async()=>response(false)));
  const view=render(<EssayRuntimeEntry workspace/>);
  await screen.findByText('현재 이용 가능한 첨삭 문항이 없습니다.');
  login('B');vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline');}));view.rerender(<EssayRuntimeEntry workspace/>);
  await screen.findByRole('alert');expect(screen.queryByText('math-workspace')).not.toBeInTheDocument();
  login('C');vi.stubGlobal('fetch',vi.fn(async()=>response(true)));view.rerender(<EssayRuntimeEntry workspace/>);
  await screen.findByText('math-workspace');
 });
 it('discards previous account admission even when its response arrives after account switch',async()=>{
  let finish!:(value:Response)=>void;
  login();const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;})).mockResolvedValue(response(false));vi.stubGlobal('fetch',fetcher);
  const view=render(<EssayRuntimeEntry workspace/>);await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));
  login('B');view.rerender(<EssayRuntimeEntry workspace/>);await screen.findByText('현재 이용 가능한 첨삭 문항이 없습니다.');
  await act(async()=>finish(response(true)));expect(screen.queryByText('math-workspace')).not.toBeInTheDocument();
 });
});
