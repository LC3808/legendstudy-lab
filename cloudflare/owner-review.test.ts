import {describe,it,expect,vi} from 'vitest';
import {handleOwnerReview} from '../functions/api/owner-review/essay';
const env={NEXT_PUBLIC_SUPABASE_URL:'https://stlhijzpjfgwwdgunlsd.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
const url='https://lab.legendstudy.com/api/owner-review/essay';
const req=(path='',method='GET',headers:Record<string,string>={Authorization:'Bearer fixture'})=>new Request(url+path,{method,headers});
const mock=(...values:unknown[])=>vi.fn().mockImplementation(async()=>Response.json(values.shift()));
describe('Owner-only read preview boundary',()=>{
 it('rejects unauthenticated users without DB or provider access',async()=>{const f=mock();expect((await handleOwnerReview(req('','GET',{}),env,f)).status).toBe(401);expect(f).not.toHaveBeenCalled();});
 it('rejects writes, other origins and arbitrary RPC/user selectors',async()=>{for(const r of [req('','POST'),req('?user=other'),req('?rpc=essay_exam_request'),req('?run=invalid'),req('','GET',{Authorization:'Bearer fixture',Origin:'https://evil.example'})]){const f=mock();expect((await handleOwnerReview(r,env,f)).status).toBeGreaterThanOrEqual(400);expect(f).not.toHaveBeenCalled();}});
 it('requires verified Auth identity before operator lookup',async()=>{const f=vi.fn(async()=>new Response('{}',{status:401}));expect((await handleOwnerReview(req(),env,f)).status).toBe(401);expect(f).toHaveBeenCalledTimes(1);});
 it.each([false,null,{admin:true},'true'])('fails closed for non-operator %j',async gate=>{const f=mock({id:'owner'},gate);expect((await handleOwnerReview(req(),env,f)).status).toBe(403);expect(f).toHaveBeenCalledTimes(2);});
 it('uses exactly the caller token and two fixed read RPCs',async()=>{const run='4e26b5b6-e605-4c87-a6ad-ce5ed70c31f1',f=mock({id:'owner'},true,{version:'essay-exam-history-v1',runs:[{id:run,state:'completed'}]});const result=await handleOwnerReview(req('?run='+run),env,f);expect(result.status).toBe(200);expect(result.headers.get('Cache-Control')).toContain('no-store');expect(f.mock.calls.map(c=>c[0])).toEqual([env.NEXT_PUBLIC_SUPABASE_URL+'/auth/v1/user',env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/rpc/admin_operator',env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/rpc/essay_exam_history']);expect(f.mock.calls[2][1].body).toBe(JSON.stringify({p_run:run}));for(const call of f.mock.calls){expect(call[1].headers.Authorization).toBe('Bearer fixture');expect(call[1].redirect).toBe('manual');}});
 it('does not substitute privileged credentials or return errors containing data',async()=>{const f=vi.fn(async()=>{throw Error('private upstream detail');});const response=await handleOwnerReview(req(),env,f);expect(response.status).toBe(502);expect(await response.text()).not.toContain('private upstream');});
 it('does not follow an upstream redirect or expose its body',async()=>{const f=vi.fn().mockResolvedValueOnce(Response.json({id:'owner'})).mockResolvedValueOnce(Response.json(true)).mockResolvedValueOnce(new Response(JSON.stringify({code:'PGRST301',message:'private detail'}),{status:302,headers:{Location:'https://other.example'}}));const response=await handleOwnerReview(req(),env,f);expect(response.status).toBe(502);expect(await response.json()).toEqual({code:'READ_UNAVAILABLE_302_PGRST301'});expect(f).toHaveBeenCalledTimes(3);});
 it('preserves owner-scoped not-found and does not attempt another read',async()=>{const f=mock({id:'owner'},true,{version:'essay-exam-history-v1',runs:[]});expect((await (await handleOwnerReview(req('?run=00000000-0000-0000-0000-000000000001'),env,f)).json()).runs).toEqual([]);expect(f).toHaveBeenCalledTimes(3);});
 it('keeps feedback inspection admin-only and selects a single fixed RPC',async()=>{
 const id='00000000-0000-0000-0000-000000000001';
 const denied=mock({id:'user'},false);expect((await handleOwnerReview(req('?feedback='+id),env,denied)).status).toBe(403);expect(denied).toHaveBeenCalledTimes(2);
 const allowed=mock({id:'owner'},true,{version:'essay-exam-history-v1',runs:[]});expect((await handleOwnerReview(req('?feedback='+id),env,allowed)).status).toBe(200);
 expect(allowed.mock.calls[2][0]).toBe(env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/rpc/admin_essay_feedback_result');expect(allowed.mock.calls[2][1].body).toBe(JSON.stringify({p_feedback:id}));
 const both=mock();expect((await handleOwnerReview(req('?feedback='+id+'&run='+id),env,both)).status).toBe(400);expect(both).not.toHaveBeenCalled();
 });
});
