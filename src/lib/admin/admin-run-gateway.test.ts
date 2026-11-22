import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {onRequestPost} from '../../../functions/api/admin/essay-run';
const mock=vi.hoisted(()=>({request:vi.fn(),fetch:vi.fn()}));
vi.mock('../math-release/server/transport',()=>({serverTransport:()=>({request:mock.request})}));
vi.mock('../essay-runtime/server/worker-binding',()=>({reviewedWorkerBinding:()=>({fetch:mock.fetch})}));
const body={run_id:'10000000-0000-4000-8000-000000000001',key:'30000000-0000-4000-8000-000000000001'};
const env={MATH_ORIGIN:'https://lab.legendstudy.com'};
const req=(data=body,headers:Record<string,string>={Authorization:'Bearer original-admin',Origin:env.MATH_ORIGIN})=>new Request(env.MATH_ORIGIN+'/api/admin/essay-run',{method:'POST',headers,body:JSON.stringify(data)});
beforeEach(()=>{vi.clearAllMocks();mock.request.mockResolvedValue(new Response('{}'));mock.fetch.mockResolvedValue(new Response(JSON.stringify({state:'queued'}),{status:202}));});afterEach(()=>vi.unstubAllGlobals());
it('forwards original admin JWT after authoritative capability check, with no caller subject',async()=>{const r=await onRequestPost({request:req(),env});expect(r.status).toBe(202);expect(r.headers.get('cache-control')).toContain('no-store');expect(mock.request).toHaveBeenCalledWith('/rest/v1/rpc/admin_lab_run_capabilities','original-admin',expect.objectContaining({body:JSON.stringify({p_run:body.run_id})}));const forwarded=mock.fetch.mock.calls[0][0] as Request;expect(forwarded.headers.get('authorization')).toBe('Bearer original-admin');expect(await forwarded.json()).toEqual(body);});
it('blocks direct student API calls before Worker',async()=>{mock.request.mockResolvedValue(new Response('{}',{status:403}));expect((await onRequestPost({request:req(),env})).status).toBe(403);expect(mock.fetch).not.toHaveBeenCalled();});
it('rejects missing login, foreign Origin and injected identity',async()=>{expect((await onRequestPost({request:req(body,{}),env})).status).toBe(401);expect((await onRequestPost({request:req(body,{Authorization:'Bearer jwt',Origin:'https://other.test'}),env})).status).toBe(403);expect((await onRequestPost({request:req({...body,subject_id:'spoof'} as typeof body),env})).status).toBe(422);expect(mock.request).not.toHaveBeenCalled();});
it('preserves retry failure and does not claim success after dispatch error',async()=>{mock.fetch.mockResolvedValue(new Response(JSON.stringify({code:'ACTIVE_LEASE'}),{status:409}));const r=await onRequestPost({request:req(),env});expect(r.status).toBe(409);expect(await r.json()).toEqual({code:'ACTIVE_LEASE'});mock.fetch.mockRejectedValue(Error('network'));expect((await onRequestPost({request:req(),env})).status).toBe(503);});
const recovery={...body,action:'recover',diagnosis_token:'a'.repeat(64)};
it('extends the existing API with a diagnosed recovery command and original caller JWT',async()=>{
 const r=await onRequestPost({request:req(recovery),env});expect(r.status).toBe(202);
 expect(mock.request).toHaveBeenCalledWith('/rest/v1/rpc/admin_lab_run_recovery','original-admin',expect.objectContaining({body:JSON.stringify({p_run:body.run_id})}));
 const sent=mock.fetch.mock.calls[0][0] as Request;expect(sent.url).toBe('https://essay-worker.internal/admin-exam-recover');expect(sent.headers.get('authorization')).toBe('Bearer original-admin');expect(await sent.json()).toEqual({...body,diagnosis_token:recovery.diagnosis_token});
});
it('blocks unauthenticated, non-admin and malformed recovery commands before Worker',async()=>{
 expect((await onRequestPost({request:req(recovery,{}),env})).status).toBe(401);
 for(const invalid of [{...recovery,diagnosis_token:'stale'},{...recovery,subject_id:'spoof'},{...recovery,recovery_type:'complete'},{...recovery,action:'force-complete'}])expect((await onRequestPost({request:req(invalid),env})).status).toBe(422);
 mock.request.mockResolvedValue(new Response('{}',{status:403}));expect((await onRequestPost({request:req(recovery),env})).status).toBe(403);expect(mock.fetch).not.toHaveBeenCalled();
});
it('preserves completed, queued, stale diagnosis and uncertain outcomes without retrying the Worker',async()=>{
 for(const [status,data]of [[200,{state:'completed'}],[202,{state:'queued'}],[409,{code:'DIAGNOSIS_STALE'}],[409,{code:'RECONCILIATION_REQUIRED'}]] as const){mock.fetch.mockResolvedValueOnce(new Response(JSON.stringify(data),{status}));const r=await onRequestPost({request:req(recovery),env});expect(r.status).toBe(status);expect(await r.json()).toEqual(data);}
 mock.fetch.mockRejectedValueOnce(Error('private upstream detail'));const r=await onRequestPost({request:req(recovery),env});expect(r.status).toBe(503);expect(await r.json()).toEqual({code:'REQUEST_UNCERTAIN'});expect(mock.fetch).toHaveBeenCalledTimes(5);
});
it('distinguishes a missing RPC from a missing request without exposing backend messages',async()=>{
 for(const [failure,status,code] of [[{code:'PGRST202',message:'private schema detail'},503,'ADMIN_CONTRACT_PENDING'],[{code:'PT404',message:'RUN_NOT_FOUND'},404,'RUN_NOT_FOUND'],[{code:'unknown',message:'private backend detail'},503,'DIAGNOSIS_UNAVAILABLE']] as const){
  mock.request.mockResolvedValueOnce(new Response(JSON.stringify(failure),{status:404}));const result=await onRequestPost({request:req(recovery),env});expect(result.status).toBe(status);expect(await result.json()).toEqual({code});
 }
 expect(mock.fetch).not.toHaveBeenCalled();
});
