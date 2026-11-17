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
 expect(init?.redirect).toBe('manual');const body=JSON.parse(String(init?.body));if(gaStatus!==200)return json({error:{message:'private diagnostic'}},gaStatus);
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
 it.each([[302,'READ_UNAVAILABLE'],[403,'PERMISSION_REQUIRED'],[429,'RATE_LIMITED'],[500,'READ_UNAVAILABLE']])('reports %s without raw diagnostic',async(status,code)=>{const r=await handleGaReport(req(),env,network(true,Number(status)),token);expect(await r.json()).toEqual({code});});
 it('fails closed on malformed GA response',async()=>{const f=network();f.mockImplementationOnce(async()=>json({id:'owner'})).mockImplementationOnce(async()=>json(true)).mockImplementationOnce(async()=>json({reports:[]}));const r=await handleGaReport(req(),env,f,token);expect(await r.json()).toEqual({code:'INVALID_RESPONSE'});});
 it('creates a short-lived readonly JWT only for Google token endpoint',async()=>{
 const keys=await generateKeyPair('RS256',{extractable:true});const privateKey=await exportPKCS8(keys.privateKey);
 const f=vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{expect(url).toBe('https://oauth2.googleapis.com/token');expect(init?.redirect).toBe('manual');const form=new URLSearchParams(String(init?.body));const decoded=await jwtVerify(form.get('assertion')!,keys.publicKey,{issuer:env.GA4_SERVICE_ACCOUNT_EMAIL,audience:'https://oauth2.googleapis.com/token'});expect(decoded.payload.scope).toBe('https://www.googleapis.com/auth/analytics.readonly');expect(decoded.payload.exp!-decoded.payload.iat!).toBe(300);return json({access_token:'short-lived-test'});});
 expect(await googleToken({...env,GA4_PRIVATE_KEY:privateKey},f,new AbortController().signal)).toBe('short-lived-test');
 });
});

describe('LAB visitor boundary',()=>{
 const labEnv={...env,GA4_LAB_PROPERTY_ID:'396674471',GA4_LAB_STREAM_ID:'16254992877',GA4_LAB_START_DATE:'2026-11-01'};
 it('queries the LAB stream and hostname over one complete period, never summed daily users',async()=>{
  const f=network();const r=await handleGaReport(req('surface=lab'),labEnv,f,token);const body=await r.json();
  expect(body).toMatchObject({version:'lab-visitors-v1',state:'CONNECTED',totalUsers:12,sessions:12,pageViews:12,startDate:'2026-11-01'});
  expect(f.mock.calls).toHaveLength(3);const call=JSON.parse(String(f.mock.calls[2][1]?.body));
  expect(call.dateRanges).toHaveLength(1);expect(call.dimensions).toBeUndefined();expect(call.metrics.map((x:{name:string})=>x.name)).toEqual(['totalUsers','sessions','screenPageViews']);
  expect(JSON.stringify(call.dimensionFilter)).toContain('lab.legendstudy.com');expect(JSON.stringify(call.dimensionFilter)).toContain('16254992877');expect(JSON.stringify(call)).not.toContain('5829568136');
 });
 it('keeps missing LAB configuration distinct from zero visitors',async()=>{
  const f=network();const body=await(await handleGaReport(req('surface=lab'),env,f,token)).json();expect(body).toEqual({version:'lab-visitors-v1',state:'UNCONNECTED'});expect(f).toHaveBeenCalledTimes(2);
 });
 it.each(['surface=lab&from=2026-11-01','surface=lab&surface=lab','surface=lab&platform=ios','surface=lab&property=other'])('rejects client changes to the cumulative scope: %s',async query=>{expect((await handleGaReport(req(query),labEnv,network(),token)).status).toBe(400);});
 it.each([false,null])('blocks non-admin LAB queries before Google (%s)',async gate=>{const f=network(gate);expect((await handleGaReport(req('surface=lab'),labEnv,f,token)).status).toBe(403);expect(f).toHaveBeenCalledTimes(2);});
 it('blocks anonymous LAB access',async()=>{const f=network();expect((await handleGaReport(req('surface=lab',false),labEnv,f,token)).status).toBe(401);expect(f).not.toHaveBeenCalled();});
});


describe('LAB empty report regression',()=>{
 const labEnv={...env,GA4_LAB_PROPERTY_ID:'396674471',GA4_LAB_STREAM_ID:'16254992877',GA4_LAB_START_DATE:'2026-11-16'};
 const empty={kind:'analyticsData#runReport',metadata:{timeZone:'Asia/Seoul'}};
 async function report(value:unknown){
  const f=network();f.mockImplementationOnce(async()=>json({id:'owner'})).mockImplementationOnce(async()=>json(true)).mockImplementationOnce(async()=>json(value));
  return handleGaReport(req('surface=lab'),labEnv,f,token);
 }
 it('accepts the production no-data envelope without inventing headers',async()=>{
  const r=await report(empty);expect(r.status).toBe(200);expect(await r.json()).toMatchObject({state:'CONNECTED',totalUsers:0,sessions:0,pageViews:0,timeZone:'Asia/Seoul',limited:false});
 });
 it('accepts an explicitly zero rowCount',async()=>{expect((await report({...empty,rowCount:0})).status).toBe(200);});
 it.each([{}, {metadata:empty.metadata}, {...empty,kind:'other'}, {...empty,metadata:{}}, {...empty,rowCount:1}, {...empty,rows:[{}]}, {...empty,metricHeaders:[]}, {...empty,totals:[{}]}])('rejects malformed or incomplete non-empty responses: %j',async value=>{
  const r=await report(value);expect(r.status).toBe(502);expect(await r.json()).toEqual({code:'INVALID_RESPONSE'});
 });
 it('retains valid zero-row header responses',async()=>{
  const r=await report({...apiReport({metrics:[{name:'totalUsers'},{name:'sessions'},{name:'screenPageViews'}]}),rows:[],rowCount:0});expect(r.status).toBe(200);expect(await r.json()).toMatchObject({totalUsers:0,sessions:0,pageViews:0});
 });
 it('rejects fractional visitor counts',async()=>{
  const r=await report({...apiReport({metrics:[{name:'totalUsers'},{name:'sessions'},{name:'screenPageViews'}]}),rows:[{metricValues:[{value:'1.5'},{value:'2'},{value:'3'}]}]});expect(r.status).toBe(502);
 });
});
