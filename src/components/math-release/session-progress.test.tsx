// @vitest-environment jsdom
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {MathSessionProgress} from './session-progress';
import type {MathSession} from '@/lib/my/essay-dashboard';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),read:vi.fn(),fetch:vi.fn()}));
vi.mock('../auth-context',()=>({useAuth:()=>({user:{id:'owner'},client:{rpc:mocks.rpc,auth:{getSession:async()=>({data:{session:{user:{id:'owner'},access_token:'synthetic'}}})}}})}));
vi.mock('@/lib/my/data',()=>({assertOwner:async()=>{}}));
vi.mock('@/lib/my/essay-dashboard',()=>({readMathSession:(...args:unknown[])=>mocks.read(...args)}));
const round=(states:string[]):MathSession=>({run_id:'round',exam_id:'exam',parent_id:null,state:'reserved',created_at:'2026-10-25',completed_at:null,questions:states.map((state,i)=>({attempt_id:'a'+i,leaf_id:'l'+i,question_id:'q'+i,evaluation_id:'e'+i,state}))});
afterEach(()=>{vi.clearAllMocks();vi.unstubAllGlobals();localStorage.clear();});
it('dispatches only REQUESTED children and offers no failed retry while another child is unknown',async()=>{
 const run=round(['COMPLETED','REQUESTED','FAILED']);mocks.read.mockResolvedValue(run);mocks.fetch.mockResolvedValue(Response.json({}));vi.stubGlobal('fetch',mocks.fetch);
 const change=vi.fn();render(<MathSessionProgress run={run} onChange={change}/>);
 expect(screen.queryByRole('button',{name:/실패 문항/})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'같은 회차 상태 확인'}));
 await waitFor(()=>expect(change).toHaveBeenCalledOnce());
 expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.fetch).toHaveBeenCalledOnce();
 expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({evaluation_id:'e1'});
});
it('keeps the same failed-only retry key after a lost response and never dispatches successful children',async()=>{
 const run=round(['COMPLETED','FAILED']);let retryCalls=0;
 mocks.read.mockImplementation(async()=>retryCalls>1?round(['COMPLETED','REQUESTED']):run);
 mocks.rpc.mockImplementation(()=>({abortSignal:async()=>{retryCalls++;return retryCalls===1?{error:{message:'lost'}}:{data:['e1'],error:null};}}));
 mocks.fetch.mockResolvedValue(Response.json({}));vi.stubGlobal('fetch',mocks.fetch);
 const change=vi.fn();render(<MathSessionProgress run={run} onChange={change}/>);
 fireEvent.click(screen.getByRole('button',{name:/실패 문항/}));
 await screen.findByText(/처리 상태를 확인하지 못했어요/);
 fireEvent.click(screen.getByRole('button',{name:/실패 문항/}));
 await waitFor(()=>expect(change).toHaveBeenCalledOnce());
 expect(mocks.rpc.mock.calls[0][1]).toEqual(mocks.rpc.mock.calls[1][1]);
 expect(mocks.fetch).toHaveBeenCalledOnce();expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({evaluation_id:'e1'});
});
