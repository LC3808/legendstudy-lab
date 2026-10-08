import type {SupabaseClient} from '@supabase/supabase-js';
import {parseEssaySummary} from './essay-summary';
import {assertOwner,ensureOwnerProfile} from './data';
export const eventLabels={planned:'지원 예정',submitted:'지원 완료',stage_pass:'1단계 합격',accepted:'최초합격',additional_acceptance:'추가합격',rejected:'불합격',not_registered:'미등록',registered:'등록'} as const;
export type EventKind=keyof typeof eventLabels;
export type ApplicationEvent={id:string;kind:EventKind|'created'|'details_changed';occurred_at:string|null;recorded_at:string;supersedes_event_id?:string|null};
export type Application={id:string;admission_year:number;university_id:string;university_name_snapshot:string;intended_division:string;admission_type:string;admission_name:string;revision:number;latest_event:ApplicationEvent|null};
export type ApplicationPage={items:Application[];has_more:boolean;offset:number};
export type EventPage={items:ApplicationEvent[];has_more:boolean;offset:number};
export type StudySummary={version:'study-summary-v1';as_of:string;timezone:'Asia/Seoul';unit:'milliseconds';source:'completed_synced_sessions';record_count:number;today_ms:number;week_ms:number;last30_ms:number;daily7:{date:string;milliseconds:number}[]};
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('INVALID_RESPONSE');return v as Record<string,unknown>;}
function string(v:unknown):string{if(typeof v!=='string')throw new Error('INVALID_RESPONSE');return v;}
function integer(v:unknown):number{if(!Number.isSafeInteger(v)||(v as number)<0)throw new Error('INVALID_RESPONSE');return v as number;}
function timestamp(v:unknown):string{const s=string(v);if(!Number.isFinite(Date.parse(s)))throw new Error('INVALID_RESPONSE');return s;}
function rows(v:unknown,max:number):unknown[]{if(!Array.isArray(v)||v.length>max)throw new Error('INVALID_RESPONSE');return v;}
export function parseStudy(v:unknown):StudySummary{
 const r=object(v);
 if(r.version!=='study-summary-v1'||r.timezone!=='Asia/Seoul'||r.unit!=='milliseconds'||r.source!=='completed_synced_sessions')throw new Error('INVALID_RESPONSE');
 const daily7=rows(r.daily7,7).map(v=>{const d=object(v);const date=string(d.date);if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('INVALID_RESPONSE');return {date,milliseconds:integer(d.milliseconds)};});
 if(daily7.length!==7||new Set(daily7.map(d=>d.date)).size!==7||daily7.some((d,i)=>d.milliseconds>86400000||(i>0&&Date.parse(d.date)-Date.parse(daily7[i-1].date)!==86400000)))throw new Error('INVALID_RESPONSE');
 const value={version:'study-summary-v1' as const,as_of:timestamp(r.as_of),timezone:'Asia/Seoul' as const,unit:'milliseconds' as const,source:'completed_synced_sessions' as const,record_count:integer(r.record_count),today_ms:integer(r.today_ms),week_ms:integer(r.week_ms),last30_ms:integer(r.last30_ms),daily7};
 if(value.today_ms>value.week_ms||value.week_ms>value.last30_ms||value.last30_ms>30*86400000||daily7[6].milliseconds!==value.today_ms)throw new Error('INVALID_RESPONSE');
 return value;
}
function parseEvent(v:unknown):ApplicationEvent{
 const e=object(v),kind=string(e.kind);
 if(!(kind in eventLabels)&&kind!=='created'&&kind!=='details_changed')throw new Error('INVALID_RESPONSE');
 return {id:string(e.id),kind:kind as ApplicationEvent['kind'],occurred_at:e.occurred_at===null?null:timestamp(e.occurred_at),recorded_at:timestamp(e.recorded_at),supersedes_event_id:typeof e.supersedes_event_id==='string'?e.supersedes_event_id:null};
}
export function parseApplications(v:unknown):ApplicationPage{
 const r=object(v);if(r.version!=='applications-v1'||typeof r.has_more!=='boolean')throw new Error('INVALID_RESPONSE');
 return {offset:integer(r.offset),has_more:r.has_more,items:rows(r.items,25).map(v=>{const a=object(v);const year=integer(a.admission_year),revision=integer(a.revision);if(year<1900||year>2200||revision<1)throw new Error('INVALID_RESPONSE');return {id:string(a.id),admission_year:year,revision,university_id:string(a.university_id),university_name_snapshot:string(a.university_name_snapshot),intended_division:string(a.intended_division),admission_type:string(a.admission_type),admission_name:string(a.admission_name),latest_event:a.latest_event===null?null:parseEvent(a.latest_event)};})};
}
export function parseEvents(v:unknown):EventPage{const r=object(v);if(r.version!=='application-events-v1'||typeof r.has_more!=='boolean')throw new Error('INVALID_RESPONSE');return {offset:integer(r.offset),has_more:r.has_more,items:rows(r.items,100).map(parseEvent)};}
async function rpc(client:SupabaseClient,owner:string,name:string,args?:Record<string,unknown>):Promise<unknown>{
 await assertOwner(client,owner);const result=await client.rpc(name,args);await assertOwner(client,owner);if(result.error)throw new Error(result.error.code==='40001'?'APPLICATION_CHANGED':'REQUEST_FAILED');return result.data;
}
export async function readStudy(client:SupabaseClient,owner:string){return parseStudy(await rpc(client,owner,'my_study_summary'));}
export async function readApplications(client:SupabaseClient,owner:string){return readApplicationPage(client,owner,0);}
export async function readApplicationPage(client:SupabaseClient,owner:string,offset:number){return parseApplications(await rpc(client,owner,'my_applications',{p_offset:offset}));}
export async function readApplicationEvents(client:SupabaseClient,owner:string,id:string,offset=0){return parseEvents(await rpc(client,owner,'my_application_events',{p_id:id,p_offset:offset}));}
export type ApplicationInput={id:string|null;revision:number;year:number;university:string;division:string;admissionType:string;admissionName:string};
export async function saveApplication(client:SupabaseClient,owner:string,input:ApplicationInput,key:string){
 await ensureOwnerProfile(client,owner);
 return string(await rpc(client,owner,'my_application_save',{p_id:input.id,p_revision:input.revision,p_year:input.year,p_university:input.university,p_division:input.division,p_admission_type:input.admissionType,p_admission_name:input.admissionName,p_request_key:key}));
}
export async function addApplicationEvent(client:SupabaseClient,owner:string,id:string,kind:EventKind,occurred:string|null,supersedes:string|null,key:string){return string(await rpc(client,owner,'my_application_event',{p_id:id,p_kind:kind,p_occurred_at:occurred,p_supersedes:supersedes,p_request_key:key}));}
export async function deleteApplication(client:SupabaseClient,owner:string,id:string){await rpc(client,owner,'my_application_delete',{p_id:id});}
/** Presentation unit conversion only; aggregation remains on the shared server. */
export function studyMinutes(ms:number){return Math.floor(ms/60000);}
/** Readable duration from the same ms: "2시간 15분" / "45분" / "0분". Presentation only. */
export function studyDuration(ms:number){const m=studyMinutes(ms);if(m<=0)return '0분';const h=Math.floor(m/60),r=m%60;return h?`${h}시간${r?` ${r}분`:''}`:`${r}분`;}

export async function readEssaySummary(client:SupabaseClient,owner:string){return parseEssaySummary(await rpc(client,owner,'my_essay_summary'));}
