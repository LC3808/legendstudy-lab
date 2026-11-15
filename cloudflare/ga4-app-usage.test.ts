import {describe,it,expect,vi} from 'vitest';
import {appUsageConfiguration,appUsageRequests,readAppUsage} from './ga4-app-usage';
import {handleGaReport,type GaEnv} from './ga4-reporting';
const config={propertyId:'396674471',streamIds:['111','222']};
const dims=new Set(['customEvent:menu_id','customEvent:content_item_id','customEvent:entry_source']);
const id='12345678-1234-1234-1234-123456789abc';
const env:GaEnv={NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public',GA4_SERVICE_ACCOUNT_EMAIL:'test@example.iam.gserviceaccount.com',GA4_PRIVATE_KEY:'test',GA4_APP_STREAM_IDS:'111,222'};
const req=()=>new Request('https://lab.legendstudy.com/api/admin/ga4?from=2026-10-01&to=2026-11-05&surface=app',{headers:{Authorization:'Bearer fixture'}});
function fakeReport(body:Record<string,unknown>,empty=false){
 const metrics=body.metrics as {name:string}[],dimensions=(body.dimensions??[]) as {name:string}[];
 return {metricHeaders:metrics,dimensionHeaders:dimensions,metadata:{timeZone:'Asia/Seoul'},rowCount:empty?0:1,rows:empty?[]:[{dimensionValues:dimensions.map(d=>({value:d.name.includes('menu_id')?'materials':d.name==='date'?'20261105':d.name==='unifiedScreenName'?'materials':d.name==='eventName'?'material_open':id})),metricValues:metrics.map(()=>({value:'7'}))}]};
}
function callFor(empty=false,registered=dims){return vi.fn(async(action:string,body:unknown)=>{
 if(action==='metadata')return {dimensions:[...registered].map(apiName=>({apiName}))};
 const b=body as {requests:Record<string,unknown>[]};expect(b.requests.length).toBeLessThanOrEqual(5);
 return {reports:b.requests.map(r=>fakeReport(r,empty))};
});}
describe('APP usage reporting',()=>{
 it('accepts the real empty dimensionless response from a new GA property',async()=>{
  const normal=callFor(true);
  const call=async(action:string,body:unknown)=>{
   const result=await normal(action,body);
   if(result.reports)return {reports:result.reports.map((r)=>r.dimensionHeaders.length?r:{kind:'analyticsData#runReport',metadata:{timeZone:'Asia/Seoul'}})};
   return result;
  };
  const r=await readAppUsage(config,'2026-10-01','2026-11-05',call,async()=>({}));
  if(r.state!=='CONNECTED')throw Error();expect(r.active.map(w=>w.users)).toEqual([null,null,null]);
 });
 it('rejects WEB streams and malformed config; never falls back to WEB',()=>{
  expect(appUsageConfiguration({})).toBeNull();
  expect(()=>appUsageConfiguration({GA4_APP_STREAM_IDS:'111'})).toThrow();
  expect(appUsageConfiguration({GA4_APP_PROPERTY_ID:'562560908',GA4_APP_STREAM_IDS:'16278486227,16278789792'})).toEqual({propertyId:'562560908',streamIds:['16278486227','16278789792']});
  for(const s of ['5829568136','16254992877','a','1,2,3'])expect(()=>appUsageConfiguration({GA4_APP_STREAM_IDS:s})).toThrow();
 });
 it('computes distinct rolling 1/7/30-day windows and ranks at source',()=>{
  const plan=appUsageRequests(config,'2026-10-01','2026-11-05',dims);
  expect(plan.active.map(w=>w.from)).toEqual(['2026-11-05','2026-10-30','2026-10-07']);
  expect(plan.requests.slice(0,6).map(r=>r.limit)).toEqual(['1','1','1','10','10','20']);
  const raw=JSON.stringify(plan.requests);expect(raw).toContain('iOS');expect(raw).toContain('Android');expect(raw).not.toContain('hostName');expect(raw).toContain('entry_source');
  expect(plan.requests[3].metrics[0].name).toBe('totalUsers');expect(plan.requests[4].metrics[0].name).toBe('eventCount');
 });
 it('resolves real Registry IDs without changing counts, batches within API limit',async()=>{
  const titles=vi.fn(async()=>({[id]:'시험 자료'}));const result=await readAppUsage(config,'2026-10-01','2026-11-05',callFor(),titles);
  expect(result.state).toBe('CONNECTED');if(result.state!=='CONNECTED')throw Error();
  expect(result.materials?.rows[0]).toEqual({label:'시험 자료',values:[7,7]});expect(titles).toHaveBeenCalledWith([id]);expect(result.menusByUsers?.rows[0].label).toBe('자료실');
 });
 it('no rows is waiting, not a fabricated zero',async()=>{
  const result=await readAppUsage(config,'2026-10-01','2026-11-05',callFor(true),async()=>({}));
  if(result.state!=='CONNECTED')throw Error();expect(result.active.every(w=>w.users===null)).toBe(true);expect(result.materials?.rows).toEqual([]);
 });
 it('missing custom dimensions leaves active user reporting usable',async()=>{
  const result=await readAppUsage(config,'2026-10-01','2026-11-05',callFor(false,new Set()),async()=>({}));
  if(result.state!=='CONNECTED')throw Error();expect(result.active[0].users).toBe(7);expect(result.materials).toBeNull();expect(result.menusByUsers).toBeNull();expect(result.missingDimensions).toHaveLength(3);
 });
 it('title failure preserves ID and counts, malformed response is rejected',async()=>{
  const result=await readAppUsage(config,'2026-10-01','2026-11-05',callFor(),async()=>{throw Error('offline');});
  if(result.state!=='CONNECTED')throw Error();expect(result.titlesUnavailable).toBe(true);expect(result.materials?.rows[0].label).toContain(id);
  await expect(readAppUsage(config,'2026-10-01','2026-11-05',async()=>({}),async()=>({}))).rejects.toThrow('INVALID_RESPONSE');
 });
 it('requires operator even when app config is absent',async()=>{
  const token=vi.fn(async()=>'test');const network=vi.fn(async(url:RequestInfo|URL)=>new Response(JSON.stringify(String(url).endsWith('/user')?{id:'test'}:false)));
  expect((await handleGaReport(req(),{...env,GA4_APP_STREAM_IDS:undefined},network,token)).status).toBe(403);expect(token).not.toHaveBeenCalled();
 });
 it('unconfigured app returns distinct unconnected state after authorization',async()=>{
  const token=vi.fn(async()=>'test');const network=vi.fn(async(url:RequestInfo|URL)=>new Response(JSON.stringify(String(url).endsWith('/user')?{id:'test'}:true)));
  const r=await handleGaReport(req(),{...env,GA4_APP_STREAM_IDS:undefined},network,token);
  expect(await r.json()).toEqual({version:'ga4-app-usage-v1',state:'UNCONNECTED'});expect(token).not.toHaveBeenCalled();expect(network).toHaveBeenCalledTimes(2);
 });
});
it('platform filters apply to every query and click events are separate from navigation',()=>{
 const p=appUsageRequests(config,'2026-11-01','2026-11-15',dims,'ios');
 for(const r of p.requests){const raw=JSON.stringify(r.dimensionFilter);expect(raw).toContain('iOS');expect(raw).not.toContain('Android');}
 expect(JSON.stringify(p.requests)).toContain('menu_click');
 expect(JSON.stringify(p.requests)).toContain('menu_view');
 expect(JSON.stringify(p.requests)).toContain('study_timer_complete');
});
it('rejects unknown platforms before any network call',async()=>{
 const network=vi.fn();const r=await handleGaReport(new Request(req().url+'&platform=web',{headers:{Authorization:'Bearer fixture'}}),env,network);
 expect(r.status).toBe(400);expect(network).not.toHaveBeenCalled();
});
