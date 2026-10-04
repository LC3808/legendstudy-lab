import {afterEach,describe,expect,it,vi} from 'vitest';
import {serverTransport,type MathEnvironment} from './transport';
import {onRequestPost as upload} from '../../../../functions/api/math/upload';
import {onRequestPost as extract} from '../../../../functions/api/math/extract';
import {onRequestPost as evaluate} from '../../../../functions/api/math/evaluate';
const own='00000000-0000-4000-8000-000000000001';
const foreign='00000000-0000-4000-8000-000000000002';
const env:MathEnvironment={MATH_ENABLED:'true',MATH_ALLOWED_SUBJECTS:own,MATH_ORIGIN:'https://math.example.invalid',MATH_PROJECT_REF:'synthetic',MATH_SUPABASE_URL:'https://synthetic.supabase.co',MATH_SUPABASE_PUBLISHABLE_KEY:'synthetic-public',MATH_EXTRACTION_WORKER_JWT:'synthetic-extraction',MATH_EVALUATION_WORKER_JWT:'synthetic-evaluation',MATH_PROVIDER_CALLS_ENABLED:'true',MATH_PROVIDER:'OPENAI',MATH_PRIMARY_MODEL:'synthetic',MATH_PROVIDER_API_KEY:'synthetic-provider'};
afterEach(()=>vi.unstubAllGlobals());
describe('synthetic-only hosted admission',()=>{
 it('permits only identity returned by authenticated Auth user endpoint',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({id:own})));
  expect(await serverTransport(env).subject('opaque-session')).toBe(own);
 });
 it.each([undefined,'','*',own+',',foreign,Array(11).fill(own).join(',')])('rejects absent/malformed/nonmatching/broad list %s',async allowed=>{
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({id:own})));
  await expect(serverTransport({...env,MATH_ALLOWED_SUBJECTS:allowed}).subject('opaque-session')).rejects.toThrow('ACCESS_DENIED');
 });
 it('does not trust token payload or caller assertion when Auth identity differs',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({id:foreign})));
  await expect(serverTransport(env).subject(`synthetic.${btoa(JSON.stringify({sub:own}))}.untrusted`)).rejects.toThrow('ACCESS_DENIED');
 });
 it.each([upload,extract,evaluate])('denies excluded user before any worker/storage/provider request',async handler=>{
  const fetcher=vi.fn(async(url:string | URL | Request)=>{expect(String(url)).toContain("/auth/v1/user");return Response.json({id:foreign});});vi.stubGlobal('fetch',fetcher);
  const request=new Request('https://math.example.invalid/api/math/test',{method:'POST',headers:{origin:env.MATH_ORIGIN!,authorization:'Bearer synthetic-session'},body:'{}'});
  const response=await handler({request,env});expect(response.status).toBeGreaterThanOrEqual(400);
  expect(fetcher).toHaveBeenCalledTimes(1);expect(String(fetcher.mock.calls[0][0])).toContain('/auth/v1/user');
  expect(await response.text()).not.toContain(foreign);
 });
});
