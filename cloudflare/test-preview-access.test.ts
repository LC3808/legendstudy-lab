import { describe, expect, it, vi } from 'vitest';
import { testPreviewAccess } from './test-preview-access';
const origin = 'https://legendstudy-task09.pages.dev';
const env = { TEST_PREVIEW_ACCESS_KEY: 'test-only-access-key-32-characters-long' };
const now = 1793491200000;
const next = vi.fn(async () => new Response('private fixture'));
async function login() {
 return testPreviewAccess(new Request(origin + '/__review-access', { method:'POST', headers:{Origin:origin},body:new URLSearchParams({access_key:env.TEST_PREVIEW_ACCESS_KEY})}),env,next,now);
}
describe('private TEST preview boundary', () => {
 it('leaves production behavior unchanged', async()=>{expect(await (await testPreviewAccess(new Request('https://lab.legendstudy.com/'),{},next,now)).text()).toBe('private fixture');});
 it.each(['/', '/admin/beta/', '/_next/static/x.js', '/api/essay/exam', '/robots.txt'])('blocks anonymous %s',async path=>{expect((await testPreviewAccess(new Request(origin+path),env,next,now)).status).toBe(401);});
 it('fails closed without secret',async()=>{expect((await testPreviewAccess(new Request(origin),{},next,now)).status).toBe(503);});
 it('requires same origin and correct credential',async()=>{
  for(const headers of [{Origin:origin},{Origin:'https://evil.example'}])expect((await testPreviewAccess(new Request(origin+'/__review-access',{method:'POST',headers,body:'access_key=wrong'}),env,next,now)).status).toBe(403);
 });
 it('allows signed cookie while preserving API Bearer authentication and disables caching',async()=>{
  const r=await login();expect(r.status).toBe(303);const cookie=r.headers.get('set-cookie')!;
  expect(cookie).toContain('Secure; HttpOnly; SameSite=Lax');
  const request=new Request(origin+'/api/example',{headers:{Cookie:cookie.split(';')[0],Authorization:'Bearer user-token'}});
  const downstream=vi.fn(async()=>{expect(request.headers.get('Authorization')).toBe('Bearer user-token');return new Response('ok');});
  const result=await testPreviewAccess(request,env,downstream,now);expect(result.status).toBe(200);expect(result.headers.get('cache-control')).toBe('no-store');
  expect((await testPreviewAccess(request,env,next,now+8*3600000)).status).toBe(401);
  expect((await testPreviewAccess(new Request('https://other.legendstudy-task09.pages.dev/',{headers:{Cookie:cookie}}),env,next,now)).status).toBe(401);
 });
 it('rejects forged cookies',async()=>{expect((await testPreviewAccess(new Request(origin,{headers:{Cookie:'__Host-task09_review=1793519999.fake'}}),env,next,now)).status).toBe(401);});
});

it('gates TASK16B assets and limits machine access to the Math callback',async()=>{
 const test='https://legendstudy-task16b.pages.dev';
 expect((await testPreviewAccess(new Request(test+'/_next/static/app.js'),env,next,now)).status).toBe(401);
 const headers={'X-Test-Preview-Access':env.TEST_PREVIEW_ACCESS_KEY};
 expect((await testPreviewAccess(new Request(test+'/api/essay/math-session',{method:'POST',headers}),env,next,now)).status).toBe(200);
 for(const path of ['/','/api/essay/exam','/admin/'])expect((await testPreviewAccess(new Request(test+path,{method:'POST',headers}),env,next,now)).status).toBe(401);
 expect((await testPreviewAccess(new Request(test+'/api/essay/math-session',{method:'POST',headers:{'X-Test-Preview-Access':'wrong'}}),env,next,now)).status).toBe(401);
});

it('native original route reaches owner-authenticated handler only on canonical TEST POST',async()=>{
 const next=vi.fn(async()=>new Response('handler'));const env={TEST_PREVIEW_ACCESS_KEY:'x'.repeat(40)};
 const make=(host:string,method='POST',token=true)=>new Request('https://'+host+'/api/math/artifact',{method,headers:token?{authorization:'Bearer synthetic'}:{}});
 expect((await testPreviewAccess(make('legendstudy-task16b.pages.dev'),env,next)).status).toBe(200);
 expect(next).toHaveBeenCalledTimes(1);
 for(const request of [make('legendstudy-task16b.pages.dev','GET'),make('legendstudy-task16b.pages.dev','POST',false),make('abc.legendstudy-task16b.pages.dev')])expect((await testPreviewAccess(request,env,next)).status).toBe(401);
 expect(next).toHaveBeenCalledTimes(1);
});

it('only explicitly enabled canonical TEST exam POST reaches JWT handler without browser cookie',async()=>{
 const env={TEST_PREVIEW_ACCESS_KEY:'x'.repeat(40),ESSAY_COMMERCE_RUNTIME_TEST_ENABLED:'true'};
 const next=vi.fn(async()=>new Response('still requires handler JWT validation'));
 const req=(host='legendstudy-task16b.pages.dev',token=true,method='POST')=>new Request(`https://${host}/api/essay/exam`,{method,headers:token?{Authorization:'Bearer synthetic'}:{}});
 expect((await testPreviewAccess(req(),env,next)).status).toBe(200);
 for(const request of [req('abc.legendstudy-task16b.pages.dev'),req('legendstudy-task16b.pages.dev',false),req('legendstudy-task16b.pages.dev',true,'GET')])expect((await testPreviewAccess(request,env,next)).status).toBe(401);
 expect((await testPreviewAccess(req(),{...env,ESSAY_COMMERCE_RUNTIME_TEST_ENABLED:'false'},next)).status).toBe(401);
 expect(next).toHaveBeenCalledTimes(1);
});
