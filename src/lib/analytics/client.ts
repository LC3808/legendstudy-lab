import {analyticsEvents,analyticsParamKeys} from './events';
import {browserGa4} from './ga4';
type Params=Record<string,unknown>;
type Transport=(command:'event',name:string,params:Record<string,string|number>)=>void;
export function sanitizeAnalyticsParams(params:Params):Record<string,string|number>{
 const clean:Record<string,string|number>={};
 for(const [key,value] of Object.entries(params)){
  if(!(analyticsParamKeys as readonly string[]).includes(key))continue;
  if(typeof value==='boolean')clean[key]=value?1:0;
  else if(typeof value==='number'&&Number.isFinite(value))clean[key]=value;
  else if(typeof value==='string'&&value.trim())clean[key]=value.trim().slice(0,100);
 }
 return clean;
}
// Browser adapter only: no backend event table, no accounting, no SDK loading.
export function createAnalytics(enabled:()=>boolean,transport:()=>Transport|undefined){
 const seen=new Set<string>();
 return (name:string,params:Params={},onceKey?:string)=>{
  if(!Object.values(analyticsEvents).some(event=>event===name))return;
  try{
   if(!enabled())return;const send=transport();if(!send)return;
   if(onceKey&&seen.has(name+':'+onceKey))return;
   send('event',name,sanitizeAnalyticsParams({platform:'web',...params}));
   if(onceKey)seen.add(name+':'+onceKey);
  }catch{/* Telemetry must never change authentication, submissions or payments. */}
 };
}
export const logAnalytics=createAnalytics(
 ()=>process.env.NEXT_PUBLIC_ANALYTICS_ENABLED==='true',
 ()=>browserGa4()?.transport(),
);
