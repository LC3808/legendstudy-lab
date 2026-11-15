import {Failure,obj,table,type GaEnv} from './ga4-reporting';
import {menuNames,featureNames,type AppPlatform,type AppUsageReport} from '../src/lib/admin/app-usage-report';
export function appUsageConfiguration(env:GaEnv){
 const raw=env.GA4_APP_STREAM_IDS?.trim();if(!raw)return null;
 const streamIds=[...new Set(raw.split(',').map(s=>s.trim()))];
 const propertyId=env.GA4_APP_PROPERTY_ID?.trim()||'';
 if(!/^\d+$/.test(propertyId)||streamIds.length>2||streamIds.some(s=>!/^\d+$/.test(s)||['5829568136','16254992877','16255062112'].includes(s)))throw new Failure('NOT_CONFIGURED',503);
 return {propertyId,streamIds};
}
type Config=NonNullable<ReturnType<typeof appUsageConfiguration>>;
type Call=(action:string,body:unknown)=>Promise<Record<string,unknown>>;
const exact=(fieldName:string,value:string)=>({filter:{fieldName,stringFilter:{matchType:'EXACT',value}}});
const oneOf=(fieldName:string,values:string[])=>({filter:{fieldName,inListFilter:{values}}});
export function appUsageRequests(config:Config,from:string,to:string,dimensions:Set<string>,platform:AppPlatform='all'){
 const base=[oneOf('streamId',config.streamIds),oneOf('platform',platform==='ios'?['iOS']:platform==='android'?['Android']:['iOS','Android'])];
 const request=(start:string,metrics:string[],dimension?:string,limit=1,filters:unknown[]=[])=>({
  dateRanges:[{startDate:start,endDate:to}],metrics:metrics.map(name=>({name})),
  ...(dimension?{dimensions:[{name:dimension}],orderBys:[{metric:{metricName:metrics[0]},desc:true},{dimension:{dimensionName:dimension}}]}:{}),
  dimensionFilter:{andGroup:{expressions:[...base,...filters]}},limit:String(limit),keepEmptyRows:false,
 });
 const active=([1,7,30] as const).map(days=>({days,from:new Date(Date.parse(to)-(days-1)*86400000).toISOString().slice(0,10),to}));
 const requests=active.map(w=>request(w.from,['activeUsers']));
 const menuDimension='customEvent:menu_id',materialDimension='customEvent:content_item_id',sourceDimension='customEvent:entry_source';
 const menuReady=dimensions.has(menuDimension),materialReady=dimensions.has(materialDimension)&&dimensions.has(sourceDimension);
 if(menuReady)for(const metrics of [['totalUsers','eventCount'],['eventCount','totalUsers']])requests.push(request(from,metrics,menuDimension,10,[exact('eventName','menu_view'),oneOf(menuDimension,Object.keys(menuNames))]));
 if(materialReady)requests.push(request(from,['eventCount','totalUsers'],materialDimension,20,[exact('eventName','material_open'),exact(sourceDimension,'materials'),{filter:{fieldName:materialDimension,stringFilter:{matchType:'FULL_REGEXP',value:'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'}}}]));
 const extensionIndex=requests.length;
 const knownEvents=['screen_view','menu_view','material_open','menu_click',...Object.keys(featureNames)];
 requests.push(request(from,['eventCount','totalUsers'],undefined,1,[oneOf('eventName',knownEvents)]));
 requests.push(request(from,['eventCount','totalUsers'],'eventName',50,[oneOf('eventName',knownEvents)]));
 requests.push(request(from,['eventCount','totalUsers'],'unifiedScreenName',10,[exact('eventName','screen_view'),oneOf('unifiedScreenName',[...Object.keys(menuNames),'material_detail'])]));
 if(menuReady)requests.push(request(from,['eventCount','totalUsers'],menuDimension,10,[exact('eventName','menu_click'),oneOf(menuDimension,Object.keys(menuNames))]));
 // Bounded observation, not an invented installation/collection start date.
 const observationFrom='2026-11-05';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const observation={...request(observationFrom,['eventCount'],'date',400,[oneOf('eventName',knownEvents)]),dateRanges:[{startDate:observationFrom,endDate:today}],orderBys:[{dimension:{dimensionName:'date'}}]};
 requests.push(observation);
 return {extensionIndex,observationFrom,active,requests,menuReady,materialReady,missingDimensions:[menuDimension,materialDimension,sourceDimension].filter(d=>!dimensions.has(d))};
}
export async function readAppUsage(config:Config,from:string,to:string,call:Call,titles:(ids:string[])=>Promise<Record<string,string>|null>,platform:AppPlatform='all'):Promise<AppUsageReport>{
 const metadata=await call('metadata',{});
 if(!Array.isArray(metadata.dimensions))throw new Failure('INVALID_RESPONSE');
 const dimensions=new Set(metadata.dimensions.map(d=>String(obj(d).apiName)));
 const plan=appUsageRequests(config,from,to,dimensions,platform);
 const reports:unknown[]=[];
 // Google batchRunReports accepts at most five requests per batch.
 for(let i=0;i<plan.requests.length;i+=5){
  const batch=await call('batchRunReports',{requests:plan.requests.slice(i,i+5)});
  if(!Array.isArray(batch.reports)||batch.reports.length!==plan.requests.slice(i,i+5).length)throw new Failure('INVALID_RESPONSE');
  reports.push(...batch.reports);
 }
 const meta=reports.map(r=>obj(obj(r).metadata));
 const timeZone=meta[0].timeZone;
 if(typeof timeZone!=='string'||meta.some(m=>m.timeZone!==timeZone))throw new Failure('INVALID_RESPONSE');
 const active=plan.active.map((w,i)=>{
  const raw=obj(reports[i]);
  // A newly created GA property omits headers for an empty dimensionless report.
  const empty=raw.kind==='analyticsData#runReport'&&raw.metricHeaders===undefined&&raw.dimensionHeaders===undefined&&raw.rows===undefined&&(raw.rowCount===undefined||raw.rowCount===0);
  return {...w,users:empty?null:table(raw,['activeUsers'],undefined,1).rows[0]?.values[0]??null};
 });
 let index=3;
 const menusByUsers=plan.menuReady?table(reports[index++],['totalUsers','eventCount'],'customEvent:menu_id',10):null;
 const menusByViews=plan.menuReady?table(reports[index++],['eventCount','totalUsers'],'customEvent:menu_id',10):null;
 const materials=plan.materialReady?table(reports[index],['eventCount','totalUsers'],'customEvent:content_item_id',20):null;
 for(const t of [menusByUsers,menusByViews])if(t)for(const row of t.rows)row.label=menuNames[row.label]||'알 수 없는 메뉴';
 let titlesUnavailable=false;
 if(materials?.rows.length){
  const ids=materials.rows.map(r=>r.label);
  if(ids.some(id=>!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/).test(id)))throw new Failure('INVALID_RESPONSE');
  const names=await titles(ids).catch(()=>null);titlesUnavailable=names===null;
  for(const row of materials.rows)row.label=names?.[row.label]||`자료명 확인 필요 · ${row.label}`;
 }
 let ext=plan.extensionIndex;
 const summaryRaw=obj(reports[ext++]);
 const summary=summaryRaw.metricHeaders===undefined&&summaryRaw.rows===undefined&&summaryRaw.kind==='analyticsData#runReport'?{columns:['eventCount','totalUsers'],totalRows:0,limited:false,rows:[]}:table(summaryRaw,['eventCount','totalUsers'],undefined,1);
 const events=table(reports[ext++],['eventCount','totalUsers'],'eventName',50);
 const screens=table(reports[ext++],['eventCount','totalUsers'],'unifiedScreenName',10);
 for(const row of screens.rows)row.label=menuNames[row.label]??(row.label==='material_detail'?'자료 상세':'기타 화면');
 const menuClicks=plan.menuReady?table(reports[ext++],['eventCount','totalUsers'],'customEvent:menu_id',10):null;
 for(const row of menuClicks?.rows??[])row.label=menuNames[row.label]??'기타 메뉴';
 const observations=table(reports[ext],['eventCount'],'date',400).rows;
 if(observations.some(r=>!/^\d{8}$/.test(r.label)))throw new Failure('INVALID_RESPONSE');
 const date=(s:string|undefined)=>s?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:null;
 return {platform,summary,events,screens,menuClicks,observationFrom:plan.observationFrom,firstObserved:date(observations[0]?.label),lastObserved:date(observations.at(-1)?.label),version:'ga4-app-usage-v1' ,state:'CONNECTED',...config,from,to,timeZone,fetchedAt:new Date().toISOString(),active,menusByUsers,menusByViews,materials,missingDimensions:plan.missingDimensions,titlesUnavailable,
 thresholded:meta.some(m=>m.subjectToThresholding===true),sampled:meta.some(m=>Array.isArray(m.samplingMetadatas)&&m.samplingMetadatas.length>0),dataLoss:meta.some(m=>m.dataLossFromOtherRow===true)};
}
