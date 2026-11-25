import type {SupabaseClient} from '@supabase/supabase-js';
export type QualitySource='exam'|'general'|'math';
export type QualityReport={cases:{runId:string;exam:string;status:string;note:string}[];sources:{label:string;path:string;commit:string}[];version:string;asOf:string;author:string;claudeReview:string;status:string;title:string;wiki:string;counts:Record<string,number>;exams:Record<string,{name:string;university:string;track:string|null}>;sections:{title:string;body:string}[];criteria:{id:string;title:string;status:string;evidence:string}[];issues:{id:string;type:string;title:string;cause:string;solution:string;priority:string;owner:string;state:string;deployed:boolean;revalidated:string}[]};
export type CensusRow={run_id:string;question_id:string;exam_id:string;state:string;created_at:string;reviewed:boolean;parent_id:string|null;official_label:string|null};
export const qualityLabels:Record<string,string>={PASS:'적합',NEEDS_IMPROVEMENT:'개선 필요',FAIL:'부적합',NOT_TESTED:'미검증',NOT_APPLICABLE:'해당 없음'};
export async function loadQualityReport(client:SupabaseClient,signal?:AbortSignal):Promise<QualityReport>{
 const {data}=await client.auth.getSession();if(!data.session)throw Error('로그인이 필요합니다.');
 const response=await fetch('/api/admin/quality-report',{headers:{Authorization:`Bearer ${data.session.access_token}`},cache:'no-store',signal});
 if(!response.ok)throw Error(response.status===403?'보고서 접근 권한이 없습니다.':'보고서 조회에 실패했습니다.');
 const report=await response.json();if(!report?.version||!Array.isArray(report.criteria)||!Array.isArray(report.sections))throw Error('보고서 형식을 확인할 수 없습니다.');return report;
}
/** Bounded pages; never silently report a truncated census as complete. */
export async function loadCensus(client:SupabaseClient,from:string,to:string):Promise<CensusRow[]>{
 const rows:CensusRow[]=[];let expected:number|undefined;
 for(let offset=0;offset<10000;offset+=50){
  const {data,error}=await client.rpc('ql_exam_cases',{p_from:from,p_to:to,p_offset:offset,p_unreviewed:false});
  if(error||!data||!Array.isArray(data.rows)||!Number.isInteger(data.total))throw Error('검수 현황을 조회하지 못했습니다.');
  if(expected!==undefined&&expected!==data.total)throw Error('조회 중 대상 수가 변경됐습니다. 새로고침해 주세요.');expected=data.total;
  rows.push(...data.rows);if(rows.length>=data.total){if(new Set(rows.map(r=>r.run_id+'/'+r.question_id)).size!==data.total)throw Error('목록 중복을 확인했습니다. 새로고침해 주세요.');return rows;}
  if(!data.rows.length)break;
 }
 throw Error('전체 목록을 확인하지 못했습니다. 기간을 줄여 주세요.');
}
