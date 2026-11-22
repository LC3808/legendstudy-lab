import {afterEach,expect,it,vi} from 'vitest';
import {onRequestPost} from '../../../functions/api/admin/essay-run';
const origin='https://lab.legendstudy.com';
const command={action:'recover',run_id:'10000000-0000-4000-8000-000000000001',key:'30000000-0000-4000-8000-000000000001',diagnosis_token:'a'.repeat(64),allow_uncertain:true};
const base={MATH_ORIGIN:origin,MATH_PROJECT_REF:'test',MATH_SUPABASE_URL:'https://test.supabase.co',MATH_SUPABASE_PUBLISHABLE_KEY:'public-test',ESSAY_WORKER_SERVICE_TOKEN:'s'.repeat(32)};
const request=()=>new Request(origin+'/api/admin/essay-run',{method:'POST',headers:{Authorization:'Bearer original-admin',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(command)});
afterEach(()=>vi.unstubAllGlobals());
for(const mode of ['binding','origin'] as const){
 it(`passes recovery through real API and ${mode} adapter exactly once after DB authorization`,async()=>{
  const calls:string[]=[];
  const worker=vi.fn(async(r:Request)=>{calls.push('worker');expect(new URL(r.url).pathname).toBe('/admin-exam-recover');expect(r.headers.get('authorization')).toBe('Bearer original-admin');expect(r.headers.get('X-Essay-Service-Token')).toBe(base.ESSAY_WORKER_SERVICE_TOKEN);const {action,...expected}=command;void action;expect(await r.json()).toEqual(expected);return Response.json({code:'ACTIVE_LEASE'},{status:409});});
  const http=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(url.startsWith(base.MATH_SUPABASE_URL)){calls.push('db');expect(url).toBe(base.MATH_SUPABASE_URL+'/rest/v1/rpc/admin_lab_run_recovery');expect(new Headers(init?.headers).get('authorization')).toBe('Bearer original-admin');return Response.json({});}return worker(new Request(url,init));});vi.stubGlobal('fetch',http);
  const env={...base,...(mode==='binding'?{ESSAY_REVIEWED_WORKER:{fetch:worker}}:{ESSAY_WORKER_ORIGIN:'https://worker.example'})};
  const response=await onRequestPost({request:request(),env});expect(response.status).toBe(409);expect(await response.json()).toEqual({code:'ACTIVE_LEASE'});expect(calls).toEqual(['db','worker']);expect(worker).toHaveBeenCalledTimes(1);
 });
 it(`denies non-admin before ${mode} adapter dispatch`,async()=>{const worker=vi.fn();const http=vi.fn(async()=>Response.json({},{status:403}));vi.stubGlobal('fetch',http);const env={...base,...(mode==='binding'?{ESSAY_REVIEWED_WORKER:{fetch:worker}}:{ESSAY_WORKER_ORIGIN:'https://worker.example'})};expect((await onRequestPost({request:request(),env})).status).toBe(403);expect(worker).not.toHaveBeenCalled();expect(http).toHaveBeenCalledTimes(1);});
}

for(const mode of ['binding','origin'] as const){
 it(`runs non-mutating readiness through ${mode} adapter with exact caller identity`,async()=>{
  const worker=vi.fn(async(r:Request)=>{expect(new URL(r.url).pathname).toBe('/admin-exam-recovery-check');expect(await r.json()).toEqual({run_id:command.run_id});expect(r.headers.get('authorization')).toBe('Bearer original-admin');return Response.json({version:'admin-recovery-check-v1',run_id:command.run_id,ready:true,provider_called:false,mutation_performed:false});});
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>String(input).startsWith(base.MATH_SUPABASE_URL)?Response.json({}):worker(new Request(String(input),init))));
  const env={...base,...(mode==='binding'?{ESSAY_REVIEWED_WORKER:{fetch:worker}}:{ESSAY_WORKER_ORIGIN:'https://worker.example'})};
  const req=new Request(origin+'/api/admin/essay-run',{method:'POST',headers:{Authorization:'Bearer original-admin','Content-Type':'application/json'},body:JSON.stringify({action:'check_recovery',run_id:command.run_id})});
  const res=await onRequestPost({request:req,env});expect(res.status).toBe(200);expect((await res.json()).mutation_performed).toBe(false);expect(worker).toHaveBeenCalledTimes(1);
 });
}
it.each(['RECOVERY_RUNTIME_INIT_FAILED','ADMIN_RPC_UNAVAILABLE','RECOVERY_RESPONSE_UNCERTAIN'])('preserves bounded Worker error %s',async code=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({})));const worker=vi.fn(async()=>Response.json({code,stage:'admin_read'},{status:503}));
 const res=await onRequestPost({request:request(),env:{...base,ESSAY_REVIEWED_WORKER:{fetch:worker}}});expect(res.status).toBe(503);expect((await res.json()).code).toBe(code);
});
