import {afterEach,describe,expect,it,vi} from 'vitest';
import {onRequestPost as upload} from '../../../../functions/api/math/upload';
import {onRequestPost as extract} from '../../../../functions/api/math/extract';
import type {MathEnvironment} from './transport';
const id='00000000-0000-4000-8000-000000000001';
const env:MathEnvironment={MATH_ALLOWED_SUBJECTS:id,MATH_ENABLED:'true',MATH_ORIGIN:'https://math.example.invalid',MATH_PROJECT_REF:'synthetic',MATH_SUPABASE_URL:'https://synthetic.supabase.co',MATH_SUPABASE_PUBLISHABLE_KEY:'synthetic-public',MATH_EXTRACTION_WORKER_JWT:'synthetic-worker'};
const bytes=new TextEncoder().encode('%PDF-1.7\nsynthetic');
function request(){const form=new FormData();form.set('artifact_id',id);form.set('file',new File([bytes],'answer.pdf',{type:'application/pdf'}));return new Request('https://math.example.invalid/api/math/upload',{method:'POST',headers:{origin:env.MATH_ORIGIN!,authorization:'Bearer synthetic-buyer'},body:form});}
afterEach(()=>vi.unstubAllGlobals());
describe('deployable Math handlers with bounded synthetic HTTP transport',()=>{
 it('interrupted duplicate upload verifies existing bytes before admission',async()=>{
  const calls:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit={})=>{
   const path=new URL(url).pathname;calls.push(path);
   if(path==='/auth/v1/user')return Response.json({id});
   if(path.endsWith('/math_artifact_storage')){
    const p=JSON.parse(String(init.body));expect(p.p_subject).toBe(id);
    if(p.p_action==='admit'){expect(p.p_sha256).toMatch(/^[a-f0-9]{64}$/);return Response.json(true);}
    return Response.json({bucket:'math-private',object_key:id+'/attempt/raw/pdf',byte_size:bytes.length,media_type:'application/pdf'});
   }
   if(path.startsWith('/storage/v1/object/authenticated/')){expect(new Headers(init.headers).get('authorization')).toBe('Bearer synthetic-worker');return new Response(bytes);}
   if(path.startsWith('/storage/v1/object/')){expect(new Headers(init.headers).get('x-upsert')).toBe('false');return new Response(null,{status:409});}
   throw Error('unexpected transport');
  }));
  const response=await upload({request:request(),env});expect(response.status).toBe(200);expect(await response.json()).toEqual({artifact_id:id,status:'PRESENT'});expect(calls.filter(p=>p.endsWith('/math_artifact_storage'))).toHaveLength(2);
 });
 it('mismatching persisted bytes never admitted; error is sanitized',async()=>{
  let admitted=false;
  vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit={})=>{
   const path=new URL(url).pathname;
   if(path==='/auth/v1/user')return Response.json({id});
   if(path.endsWith('/math_artifact_storage')){const p=JSON.parse(String(init.body));admitted||=p.p_action==='admit';return Response.json({bucket:'math-private',object_key:id+'/attempt/raw/pdf',byte_size:bytes.length,media_type:'application/pdf'});}
   if(path.includes('/authenticated/'))return new Response('wrong');
   return new Response(null,{status:409});
  }));
  const response=await upload({request:request(),env});expect(response.status).toBe(409);expect(admitted).toBe(false);expect(await response.text()).toBe('{"code":"UPLOAD_UNAVAILABLE"}');
 });
 it('foreign extraction is denied before worker claim, Storage or provider',async()=>{
  const calls:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>{calls.push(url);return url.endsWith('/auth/v1/user')?Response.json({id}):new Response(null,{status:403});}));
  const request=new Request('https://math.example.invalid/api/math/extract',{method:'POST',headers:{origin:env.MATH_ORIGIN!,authorization:'Bearer synthetic-buyer'},body:JSON.stringify({attempt_id:id})});
  const response=await extract({request,env:{...env,MATH_PROVIDER:'OPENAI',MATH_PRIMARY_MODEL:'synthetic',MATH_PROVIDER_API_KEY:'synthetic',MATH_PROVIDER_CALLS_ENABLED:'true'}});
  expect(response.status).toBe(409);expect(calls).toHaveLength(2);expect(calls[1]).toContain('/math_input');
 });
});

it('public extraction refuses an owned but unreleased leaf before claim or Provider',async()=>{
 const calls:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
  calls.push(url);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'00000000-0000-4000-8000-000000000002'});
  if(url.endsWith('/math_input'))return Response.json({result:{attempt:{leaf_id:'00000000-0000-4000-8000-000000000003'}}});
  throw Error('Unexpected privileged call');
 }));
 const req=new Request('https://math.example.invalid/api/math/extract',{method:'POST',headers:{origin:env.MATH_ORIGIN!,authorization:'Bearer fixture'},body:JSON.stringify({attempt_id:id})});
 expect((await extract({request:req,env:{...env,MATH_PUBLIC_LEAVES:id,MATH_PROVIDER:'OPENAI',MATH_PRIMARY_MODEL:'fixture',MATH_PROVIDER_API_KEY:'fixture',MATH_PROVIDER_CALLS_ENABLED:'true'}})).status).toBe(409);
 expect(calls).toHaveLength(2);
});

it.each(['success','23514','ambiguous'] as const)('OCR finalization recovery distinguishes %s without retrying the Provider',async mode=>{
 const actions:string[]=[];let providerCalls=0;
 vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit={})=>{
  const path=new URL(url).pathname;
  if(path==='/auth/v1/user')return Response.json({id});
  if(path.endsWith('/math_input'))return Response.json({result:{attempt:{leaf_id:id}}});
  if(path.endsWith('/math_extraction')){
   const {p_request:r}=JSON.parse(String(init.body));actions.push(r.action);
   if(r.action==='claim')return Response.json({result:{run_id:id,lease_token:id,evidence:[{artifact_id:id,bucket:'math-private',object_key:id+'/page.png',media_type:'image/png'}]}});
   if(r.action==='finalize'){
    if(mode==='23514')return Response.json({code:'23514',details:'private answer must not be logged'},{status:400});
    if(mode==='ambiguous')throw Error('connection lost');
    expect(r.payload.output.regions).toHaveLength(1);
   }
   return Response.json({result:{}});
  }
  if(path.includes('/storage/'))return new Response(new Uint8Array([1,2]));
  if(url==='https://api.openai.com/v1/responses'){
   providerCalls++;
   return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({regions:[{artifact_id:id,page:1,reading_order:1,raw_text:'x²',normalized_math:'x^2',confidence:0.9,uncertain:true,x:0,y:0,width:0.5,height:0.2}]})}]}]});
  }
  throw Error('unexpected transport');
 }));
 const req=new Request('https://math.example.invalid/api/math/extract',{method:'POST',headers:{origin:env.MATH_ORIGIN!,authorization:'Bearer fixture'},body:JSON.stringify({attempt_id:id})});
 const result=await extract({request:req,env:{...env,MATH_PROVIDER:'OPENAI',MATH_PRIMARY_MODEL:'fixture',MATH_PROVIDER_API_KEY:'fixture',MATH_PROVIDER_CALLS_ENABLED:'true'}});
 expect(result.status).toBe(mode==='success'?200:409);
 expect(providerCalls).toBe(1);
 expect(actions).toEqual(mode==='23514'?['claim','finalize','fail']:['claim','finalize']);
});
