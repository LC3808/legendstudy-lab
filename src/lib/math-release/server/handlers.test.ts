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
