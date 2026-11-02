import {importPKCS8, SignJWT} from 'jose';
import {promoEvents,type GaReport,type GaTable} from '../src/lib/admin/ga4-report';
export type GaEnv={NEXT_PUBLIC_SUPABASE_URL?:string;NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?:string;
 GA4_SERVICE_ACCOUNT_EMAIL?:string;GA4_PRIVATE_KEY?:string;GA4_REPORT_ORIGIN?:string};
const property='396674471',stream='5829568136';
const headers={'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
class Failure extends Error {constructor(readonly code:string,readonly status=502){super(code);}}
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Failure('INVALID_RESPONSE');return v as Record<string,unknown>;};
function dates(url:URL){
 if([...url.searchParams.keys()].some(k=>!['from','to'].includes(k))||url.searchParams.getAll('from').length!==1||url.searchParams.getAll('to').length!==1)throw new Failure('INVALID_REQUEST',400);
 const from=url.searchParams.get('from')!,to=url.searchParams.get('to')!;
 const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 if(!valid(from)||!valid(to)||to<from||Date.parse(to)-Date.parse(from)>=400*86400000)throw new Failure('INVALID_REQUEST',400);
 return {from,to};
}
export async function googleToken(env:GaEnv,fetcher:typeof fetch,signal:AbortSignal){
 if(!env.GA4_SERVICE_ACCOUNT_EMAIL?.endsWith('.iam.gserviceaccount.com')||!env.GA4_PRIVATE_KEY)throw new Failure('NOT_CONFIGURED',503);
 try{
 const key=await importPKCS8(env.GA4_PRIVATE_KEY.replace(/\\n/g,'\n'),'RS256');
 const assertion=await new SignJWT({scope:'https://www.googleapis.com/auth/analytics.readonly'})
 .setProtectedHeader({alg:'RS256',typ:'JWT'}).setIssuer(env.GA4_SERVICE_ACCOUNT_EMAIL)
 .setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('5m').sign(key);
 const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal,
 headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}).toString()});
 if(!r.ok)throw new Failure('TOKEN_UNAVAILABLE');const data=obj(await r.json());
 if(typeof data.access_token!=='string'||!data.access_token)throw new Failure('TOKEN_UNAVAILABLE');return data.access_token;
 }catch{throw new Failure('TOKEN_UNAVAILABLE');}
}
const hostFilter={andGroup:{expressions:[{filter:{fieldName:'streamId',stringFilter:{matchType:'EXACT',value:stream}}},{filter:{fieldName:'hostName',inListFilter:{values:['legendstudy.com','www.legendstudy.com']}}}]}};
function report(from:string,to:string,metrics:string[],dimension?:string,limit=400,extra?:unknown){
 return {dateRanges:[{startDate:from,endDate:to}],metrics:metrics.map(name=>({name})),...(dimension?{dimensions:[{name:dimension}]}:{}),
 dimensionFilter:extra?{andGroup:{expressions:[hostFilter,extra]}}:hostFilter,limit:String(limit),
 ...(dimension?{orderBys:[dimension==='date'?{dimension:{dimensionName:'date'}}:{metric:{metricName:metrics[0]},desc:true}]}:{}),keepEmptyRows:false};
}
function table(raw:unknown,metrics:string[],dimension?:string,limit=400):GaTable{
 const r=obj(raw);const mh=r.metricHeaders;if(!Array.isArray(mh)||mh.length!==metrics.length||mh.some((v,i)=>obj(v).name!==metrics[i]))throw new Failure('INVALID_RESPONSE');
 const dh=r.dimensionHeaders??[];if(!Array.isArray(dh)||dh.length!==(dimension?1:0)||(dimension&&obj(dh[0]).name!==dimension))throw new Failure('INVALID_RESPONSE');
 const rows=r.rows??[];if(!Array.isArray(rows)||rows.length>limit)throw new Failure('INVALID_RESPONSE');
 const totalRows=r.rowCount??rows.length;if(typeof totalRows!=='number'||!Number.isInteger(totalRows)||totalRows<rows.length)throw new Failure('INVALID_RESPONSE');
 return {columns:metrics,totalRows,limited:totalRows>rows.length,rows:rows.map(value=>{
 const row=obj(value);const mv=row.metricValues;if(!Array.isArray(mv)||mv.length!==metrics.length)throw new Failure('INVALID_RESPONSE');
 const dv=row.dimensionValues;let label='전체';if(dimension){if(!Array.isArray(dv)||dv.length!==1||typeof obj(dv[0]).value!=='string')throw new Failure('INVALID_RESPONSE');label=String(obj(dv[0]).value);}
 // Never return query strings, emails or private paths from legacy GA page dimensions.
 if(dimension==='pagePath'){label=label.split(/[?#]/)[0];if(!/^\/(?:\d+\/?|(?:category|tag)(?:\/[^@?#]{0,150})?|)$/.test(label))label='기타 경로 (개인정보 보호)';}
 return {label:label.slice(0,200),values:mv.map(v=>{const s=obj(v).value;if(typeof s!=='string'||!/^\d+(?:\.\d+)?$/.test(s))throw new Failure('INVALID_RESPONSE');const n=Number(s);if(!Number.isFinite(n))throw new Failure('INVALID_RESPONSE');return n;})};})};
}
export async function handleGaReport(request:Request,env:GaEnv,fetcher:typeof fetch=fetch,tokenProvider=googleToken):Promise<Response>{
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(request.method!=='GET')return reply({code:'METHOD_NOT_ALLOWED'},405);
 const url=new URL(request.url),origin=env.GA4_REPORT_ORIGIN||'https://lab.legendstudy.com';
 if(url.origin!==origin||(request.headers.has('Origin')&&request.headers.get('Origin')!==origin))return reply({code:'ADMIN_REQUIRED'},403);
 const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer ')||authorization.length>8192)return reply({code:'LOGIN_REQUIRED'},401);
 try{
 const {from,to}=dates(url);const base=env.NEXT_PUBLIC_SUPABASE_URL;
 if(!base||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base)||!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)throw new Failure('NOT_CONFIGURED',503);
 const signal=AbortSignal.timeout(25000);
 const h={Authorization:authorization,apikey:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};
 const user=await fetcher(base+'/auth/v1/user',{headers:h,signal,redirect:'error'});
 if(user.status===401||user.status===403)throw new Failure('LOGIN_REQUIRED',401);
 if(!user.ok)throw new Failure('AUTH_UNAVAILABLE',502);
 if(typeof obj(await user.json()).id!=='string')throw new Failure('LOGIN_REQUIRED',401);
 const gate=await fetcher(base+'/rest/v1/rpc/admin_operator',{method:'POST',headers:h,body:'{}',signal,redirect:'error'});
 if(!gate.ok)throw new Failure('AUTH_UNAVAILABLE',502);
 if(await gate.json()!==true)throw new Failure('ADMIN_REQUIRED',403);
 if(!env.GA4_SERVICE_ACCOUNT_EMAIL||!env.GA4_PRIVATE_KEY)throw new Failure('NOT_CONFIGURED',503);
 const token=await tokenProvider(env,fetcher,signal);
 const call=async(action:string,body:unknown)=>{
 const r=await fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:${action}`,{method:'POST',signal,redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok){const err=await r.json().catch(()=>null);const disabled=JSON.stringify(err).includes('SERVICE_DISABLED');throw new Failure(r.status===429?'RATE_LIMITED':disabled?'API_DISABLED':r.status===401||r.status===403?'PERMISSION_REQUIRED':'READ_UNAVAILABLE',r.status===429?429:502);}return obj(await r.json());};
 const metrics=['activeUsers','newUsers','sessions','screenPageViews'];
 const [batch,returning]=await Promise.all([
 call('batchRunReports',{requests:[report(from,to,metrics),report(from,to,metrics,'date'),report(from,to,['sessions','activeUsers'],'sessionDefaultChannelGroup',20),report(from,to,['screenPageViews','activeUsers'],'pagePath',20),report(from,to,['eventCount','totalUsers'],'eventName',4,{filter:{fieldName:'eventName',inListFilter:{values:[...promoEvents]}}})]}),
 call('runReport',report(from,to,['totalUsers'],undefined,1,{filter:{fieldName:'newVsReturning',stringFilter:{matchType:'EXACT',value:'returning'}}}))]);
 if(!Array.isArray(batch.reports)||batch.reports.length!==5)throw new Failure('INVALID_RESPONSE');
 const rs=batch.reports,all=[...rs,returning];
 const zones=all.map(r=>obj(obj(r).metadata??{}).timeZone);if(zones.some(z=>typeof z!=='string'||z!==zones[0]))throw new Failure('INVALID_RESPONSE');
 const result:GaReport={version:'ga4-report-v1',source:'GA4',propertyId:property,streamId:stream,startDate:from,endDate:to,timeZone:zones[0] as string,fetchedAt:new Date().toISOString(),
 summary:table(rs[0],metrics,undefined,1),daily:table(rs[1],metrics,'date'),channels:table(rs[2],['sessions','activeUsers'],'sessionDefaultChannelGroup',20),pages:table(rs[3],['screenPageViews','activeUsers'],'pagePath',20),events:table(rs[4],['eventCount','totalUsers'],'eventName',4),returning:table(returning,['totalUsers'],undefined,1),
 thresholded:all.some(r=>obj(obj(r).metadata??{}).subjectToThresholding===true),sampled:all.some(r=>Array.isArray(obj(obj(r).metadata??{}).samplingMetadatas)&& (obj(obj(r).metadata??{}).samplingMetadatas as unknown[]).length>0),dataLoss:all.some(r=>obj(obj(r).metadata??{}).dataLossFromOtherRow===true)};
 return reply(result);
 }catch(e){return reply({code:e instanceof Failure?e.code:'READ_UNAVAILABLE'},e instanceof Failure?e.status:502);}
}
