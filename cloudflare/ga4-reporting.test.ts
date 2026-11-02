import {describe,it,expect,vi} from 'vitest';
import {generateKeyPair,exportPKCS8,jwtVerify} from 'jose';
import {handleGaReport,googleToken,type GaEnv} from './ga4-reporting';
const env:GaEnv={NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public-test',GA4_SERVICE_ACCOUNT_EMAIL:'analytics@legendstudy.iam.gserviceaccount.com',GA4_PRIVATE_KEY:'test-only'};
const req=(query='from=2026-11-01&to=2026-11-02',auth=true)=>new Request('https://lab.legendstudy.com/api/admin/ga4?'+query,{headers:auth?{Authorization:'Bearer test-user'}:{}});
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status});
function apiReport(body:Record<string,unknown>){
 const m=body.metrics as {name:string}[],d=(body.dimensions??[]) as {name:string}[];
 return {metricHeaders:m,dimensionHeaders:d,metadata:{timeZone:'Asia/Seoul'},rowCount:1,rows:[{dimensionValues:d.map(x=>({value:x.name==='pagePath'?'/123?token=private':x.name==='eventName'?'app_promo_click':x.name==='date'?'20261101':'Organic Search'})),metricValues:m.map(()=>({value:'12'}))}]};
}
function network(gate:unknown=true,gaStatus=200){return vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{
 const path=String(url);if(path.endsWith('/auth/v1/user'))return json({id:'owner'});
 if(path.endsWith('/rpc/admin_operator'))return json(gate);
 const body=JSON.parse(String(init?.body));if(gaStatus!==200)return json({error:{message:'private diagnostic'}},gaStatus);
 return json(path.endsWith(':batchRunReports')?{reports:body.requests.map(apiReport)}:apiReport(body));
 });}
const token=vi.fn(async()=>'google-token-test');
describe('GA4 server boundary',()=>{
 it('rejects anonymous without any network request',async()=>{const f=network();expect((await handleGaReport(req(undefined,false),env,f,token)).status).toBe(401);expect(f).not.toHaveBeenCalled();});
 it.each([false,null,{},'true'])('denies non-admin gate %s before Google',async gate=>{const f=network(gate);expect((await handleGaReport(req(),env,f,token)).status).toBe(403);expect(f).toHaveBeenCalledTimes(2);});
 it.each(['from=2026-02-30&to=2026-03-02','from=2026-11-02&to=2026-11-01','from=2020-01-01&to=2026-11-01','from=2026-11-01&to=2026-11-02&property=other','from=2026-11-01&from=2026-11-01&to=2026-11-02'])('rejects invalid/flexible query %s',async query=>{const f=network();expect((await handleGaReport(req(query),env,f,token)).status).toBe(400);expect(f).not.toHaveBeenCalled();});
 it('rejects foreign origin and POST',async()=>{const f=network();expect((await handleGaReport(new Request(req(),{headers:{Origin:'https://evil.example',Authorization:'Bearer t'}}),env,f,token)).status).toBe(403);expect((await handleGaReport(new Request(req(),{method:'POST'}),env,f,token)).status).toBe(405);expect(f).not.toHaveBeenCalled();});
 it('missing config is not empty or zero data',async()=>{const r=await handleGaReport(req(),{...env,GA4_PRIVATE_KEY:undefined},network(),token);expect(r.status).toBe(503);expect(await r.json()).toEqual({code:'NOT_CONFIGURED'});});
 it('uses fixed property, stream, host; distinct returning query; no secrets in output',async()=>{const f=network();const r=await handleGaReport(req(),env,f,token);const body=await r.json();expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('no-store');expect(body.pages.rows[0].label).toBe('/123');expect(JSON.stringify(body)).not.toMatch(/private|google-token|Bearer/);const calls=f.mock.calls.slice(2);expect(calls.every(c=>String(c[0]).includes('properties/396674471:'))).toBe(true);const request=JSON.parse(String(calls[0][1]?.body));expect(request.requests).toHaveLength(5);expect(JSON.stringify(request)).toContain('5829568136');expect(JSON.stringify(request)).toContain('legendstudy.com');expect(JSON.stringify(calls[1][1])).toContain('returning');expect(body.summary.rows[0].values[0]).toBe(12);});
 it.each([[403,'PERMISSION_REQUIRED'],[429,'RATE_LIMITED'],[500,'READ_UNAVAILABLE']])('reports %s without raw diagnostic',async(status,code)=>{const r=await handleGaReport(req(),env,network(true,Number(status)),token);expect(await r.json()).toEqual({code});});
 it('fails closed on malformed GA response',async()=>{const f=network();f.mockImplementationOnce(async()=>json({id:'owner'})).mockImplementationOnce(async()=>json(true)).mockImplementationOnce(async()=>json({reports:[]}));const r=await handleGaReport(req(),env,f,token);expect(await r.json()).toEqual({code:'INVALID_RESPONSE'});});
 it('creates a short-lived readonly JWT only for Google token endpoint',async()=>{
 const keys=await generateKeyPair('RS256',{extractable:true});const privateKey=await exportPKCS8(keys.privateKey);
 const f=vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{expect(url).toBe('https://oauth2.googleapis.com/token');const form=new URLSearchParams(String(init?.body));const decoded=await jwtVerify(form.get('assertion')!,keys.publicKey,{issuer:env.GA4_SERVICE_ACCOUNT_EMAIL,audience:'https://oauth2.googleapis.com/token'});expect(decoded.payload.scope).toBe('https://www.googleapis.com/auth/analytics.readonly');expect(decoded.payload.exp!-decoded.payload.iat!).toBe(300);return json({access_token:'short-lived-test'});});
 expect(await googleToken({...env,GA4_PRIVATE_KEY:privateKey},f,new AbortController().signal)).toBe('short-lived-test');
 });
});
