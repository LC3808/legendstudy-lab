// @vitest-environment jsdom
import {act,renderHook,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {useEssayServiceStatus} from './use-essay-service-status';
const m=vi.hoisted(()=>({owner:'a',session:vi.fn(),fetch:vi.fn()}));
const client={auth:{getSession:m.session}};
vi.mock('./auth-context',()=>({useAuth:()=>({client,user:{id:m.owner},status:'authenticated'})}));
const id='33333333-3333-4333-8333-333333333333';
const good=()=>Response.json({version:'essay-public-service-v1',checked:true,universityIds:[id]});
beforeEach(()=>{vi.resetAllMocks();m.owner='a';m.session.mockImplementation(async()=>({data:{session:{user:{id:m.owner},access_token:'fixture'}}}));vi.stubGlobal('fetch',m.fetch);});
afterEach(()=>vi.unstubAllGlobals());
it('keeps loading/error separate and retries to ready',async()=>{m.fetch.mockResolvedValueOnce(new Response('',{status:503})).mockImplementationOnce(async()=>good());const {result}=renderHook(()=>useEssayServiceStatus());expect(result.current.status).toBe('loading');await waitFor(()=>expect(result.current.status).toBe('error'));act(()=>result.current.retry());await waitFor(()=>expect(result.current.status).toBe('ready'));expect(result.current.universities.has(id)).toBe(true);expect(m.fetch).toHaveBeenCalledTimes(2);});
it('ignores an old account response and does not issue focus requests',async()=>{let finish!:(v:Response)=>void;m.fetch.mockImplementationOnce(()=>new Promise(r=>finish=r)).mockImplementationOnce(async()=>good());const {result,rerender}=renderHook(()=>useEssayServiceStatus());await waitFor(()=>expect(m.fetch).toHaveBeenCalledTimes(1));m.owner='b';rerender();await waitFor(()=>expect(result.current.status).toBe('ready'));await act(async()=>finish(new Response('',{status:503})));expect(result.current.status).toBe('ready');act(()=>window.dispatchEvent(new Event('focus')));expect(m.fetch).toHaveBeenCalledTimes(2);});
