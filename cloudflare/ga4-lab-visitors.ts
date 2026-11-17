import {Failure,obj,table} from './ga4-reporting';
import type {GaEnv} from './ga4-reporting';
import type {LabVisitors} from '../src/lib/admin/lab-visitors';
export function labVisitorConfiguration(env:GaEnv){
 const propertyId=env.GA4_LAB_PROPERTY_ID,streamId=env.GA4_LAB_STREAM_ID,startDate=env.GA4_LAB_START_DATE;
 if(!propertyId||!streamId||!startDate)return null;
 if(!/^\d{1,20}$/.test(propertyId)||!/^\d{1,20}$/.test(streamId)||!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!Number.isFinite(Date.parse(startDate))||new Date(startDate).toISOString().slice(0,10)!==startDate)throw new Failure('NOT_CONFIGURED',503);
 return {propertyId,streamId,startDate};
}
export async function readLabVisitors(config:NonNullable<ReturnType<typeof labVisitorConfiguration>>,to:string,call:(action:string,body:unknown)=>Promise<Record<string,unknown>>):Promise<LabVisitors>{
 if(config.startDate>to)throw new Failure('NOT_CONFIGURED',503);
 const metrics=['totalUsers','sessions','screenPageViews'];
 const response=await call('runReport',{
  dateRanges:[{startDate:config.startDate,endDate:to}],metrics:metrics.map(name=>({name})),limit:'1',
  dimensionFilter:{andGroup:{expressions:[
   {filter:{fieldName:'streamId',stringFilter:{matchType:'EXACT',value:config.streamId}}},
   {filter:{fieldName:'hostName',stringFilter:{matchType:'EXACT',value:'lab.legendstudy.com'}}},
  ]}},
 });
 const metadata=obj(response.metadata??{});
 if(typeof metadata.timeZone!=='string'||!metadata.timeZone)throw new Failure('INVALID_RESPONSE');
 // GA omits all table fields for an empty result. Accept only its typed,
 // metadata-bearing empty envelope; malformed/non-empty reports still fail closed.
 const emptyReport=response.kind==='analyticsData#runReport'&&
  response.metricHeaders===undefined&&response.dimensionHeaders===undefined&&
  response.rows===undefined&&(response.rowCount===undefined||response.rowCount===0)&&
  response.totals===undefined&&response.maximums===undefined&&response.minimums===undefined;
 const counts=emptyReport?[0,0,0]:table(response,metrics,undefined,1).rows[0]?.values??[0,0,0];
 if(counts.some(n=>!Number.isSafeInteger(n)||n<0))throw new Failure('INVALID_RESPONSE');
 return {version:'lab-visitors-v1',state:'CONNECTED',startDate:config.startDate,endDate:to,timeZone:metadata.timeZone,
  totalUsers:counts[0],sessions:counts[1],pageViews:counts[2],fetchedAt:new Date().toISOString(),
  limited:metadata.subjectToThresholding===true||metadata.dataLossFromOtherRow===true||(Array.isArray(metadata.samplingMetadatas)&&metadata.samplingMetadatas.length>0)};
}
