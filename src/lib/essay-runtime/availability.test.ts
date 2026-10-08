import {describe,it,expect,vi,afterEach} from 'vitest';
import {onRequestGet} from '../../../functions/api/essay/availability';
import type {MathEnvironment} from '../math-release/server/transport';
const url='https://stlhijzpjfgwwdgunlsd.supabase.co';
const id='00000000-0000-4000-8000-000000000001';
function jwt(role:string,exp=Date.now()/1000+600){return 'fixture.'+btoa(JSON.stringify({role,exp}))+'.test';}
const env:MathEnvironment={MATH_ORIGIN:'https://lab.legendstudy.com',MATH_ENABLED:'true',MATH_PROVIDER_CALLS_ENABLED:'true',MATH_PROVIDER:'OPENAI',MATH_PRIMARY_MODEL:'approved-fixture',MATH_PROVIDER_API_KEY:'fixture-key',MATH_EXTRACTION_WORKER_JWT:jwt('math_extraction_worker'),MATH_EVALUATION_WORKER_JWT:jwt('math_evaluation_worker'),MATH_ALLOWED_SUBJECTS:id,MATH_PROJECT_REF:'stlhijzpjfgwwdgunlsd',MATH_SUPABASE_URL:url,MATH_SUPABASE_PUBLISHABLE_KEY:'public-fixture'};
function request(auth=true){return new Request('https://lab.legendstudy.com/api/essay/availability',{headers:auth?{authorization:'Bearer user-fixture'}:{}});}
afterEach(()=>vi.unstubAllGlobals());
describe('four-type release boundary',()=>{
 it('keeps all types closed to anonymous and missing/expired server worker config without network or Credit calls',async()=>{
  const network=vi.fn();vi.stubGlobal('fetch',network);
  for(const [req,bindings] of [[request(false),env],[request(),{}],[request(),{...env,MATH_EVALUATION_WORKER_JWT:jwt('math_evaluation_worker',0)}]] as const){
   const res=await onRequestGet({request:req,env:bindings});expect(Object.values((await res.json()).types)).toEqual([false,false,false,false]);expect(res.headers.get('cache-control')).toContain('no-store');
  }expect(network).not.toHaveBeenCalled();
 });
 it('requires verified subject, enabled DB switch and catalog; mixed/science/human worker cannot be inferred from Math',async()=>{
  const calls:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async(input:string)=>{calls.push(input);return Response.json(input.endsWith('/auth/v1/user')?{id}:input.endsWith('/essay_web_runtime_status')?{version:'essay-web-runtime-v1',math_evaluations_enabled:true}:[{leaf_id:id}]);}));
  const body=await (await onRequestGet({request:request(),env})).json();expect(body.types).toEqual({humanities_social:false,business_economics:false,math:true,science:false});
  expect(calls).toHaveLength(3);expect(calls.every(x=>x.startsWith(url))).toBe(true);
  expect(calls.some(x=>/evaluation|grant|reserve|provider/.test(x))).toBe(false);
 });
 it('fails closed on paused DB, no catalog, foreign user or read error, with no evaluation requests',async()=>{
  for(const mode of ['paused','empty','foreign','error']){
   vi.stubGlobal('fetch',vi.fn(async(input:string)=>{
    if(mode==='error')throw Error('network');
    return Response.json(input.endsWith('/auth/v1/user')?{id:mode==='foreign'?'00000000-0000-4000-8000-000000000002':id}:input.endsWith('/essay_web_runtime_status')?{version:'essay-web-runtime-v1',math_evaluations_enabled:mode!=='paused'}:[]);
   }));
   expect((await (await onRequestGet({request:request(),env})).json()).types.math).toBe(false);
  }
 });
});
