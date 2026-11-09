// Student-facing school participation / ranking data contract.
// Reads go through dedicated STUDENT RPCs (student_school_card / student_school_ranking)
// that are separate from the admin RPCs. The RPCs are a candidate (not yet applied),
// so every reader is guarded: on any error or missing RPC it returns null and the UI
// shows a "준비 중" / empty state — never fabricated data.
import type {SupabaseClient} from '@supabase/supabase-js';

export type SchoolCard =
  | {hasSchool:false}
  | {
      hasSchool:true;
      officeCode:string; schoolCode:string;
      registeredUsers:number;   // 학교를 등록한 유효 가입 학생 수
      activeUsers7d:number;      // 최근 7일 공부시간 기록자 수
      weekMs:number;            // 이번 주 총 공부시간(ms)
      rank:number|null;         // 이번 주 총공부시간 전국 순위 (표본 부족 시 null)
      asOf:string;
    };

export type SchoolRankMetric = 'total' | 'average' | 'registered';
export type SchoolRankPeriod = 'week' | 'last_week' | 'month';
export type SchoolRankRow = {
  officeCode:string; schoolCode:string;
  registeredUsers:number; activeUsers:number; ms:number; avgMs:number; rank:number;
};
export type SchoolRanking = {
  metric:SchoolRankMetric; period:SchoolRankPeriod; minUsers:number; schoolCount:number;
  mySchool:SchoolRankRow|null; top:SchoolRankRow[]; around:SchoolRankRow[]; asOf:string;
};

function obj(v:unknown):Record<string,unknown>{ if(!v||typeof v!=='object'||Array.isArray(v)) throw new Error('MALFORMED'); return v as Record<string,unknown>; }
function num(v:unknown):number{ if(typeof v!=='number'||!Number.isFinite(v)) throw new Error('MALFORMED'); return v; }
function nnum(v:unknown):number|null{ return v===null?null:num(v); }
function str(v:unknown):string{ if(typeof v!=='string') throw new Error('MALFORMED'); return v; }

function parseRow(v:unknown):SchoolRankRow{
  const r=obj(v);
  return {officeCode:str(r.office_code), schoolCode:str(r.school_code), registeredUsers:num(r.registered_users), activeUsers:num(r.active_users), ms:num(r.ms), avgMs:num(r.avg_ms), rank:num(r.rank)};
}

export function parseSchoolCard(raw:unknown):SchoolCard{
  const r=obj(raw);
  if(r.version!=='student-school-card-v1') throw new Error('MALFORMED');
  if(r.has_school!==true) return {hasSchool:false};
  return {
    hasSchool:true,
    officeCode:str(r.office_code), schoolCode:str(r.school_code),
    registeredUsers:num(r.registered_users), activeUsers7d:num(r.active_users_7d),
    weekMs:num(r.week_ms), rank:nnum(r.rank), asOf:str(r.as_of),
  };
}

export function parseSchoolRanking(raw:unknown):SchoolRanking{
  const r=obj(raw);
  if(r.version!=='student-school-ranking-v1') throw new Error('MALFORMED');
  const metric=str(r.metric) as SchoolRankMetric;
  if(!['total','average','registered'].includes(metric)) throw new Error('MALFORMED');
  const period=str(r.period) as SchoolRankPeriod;
  if(!['week','last_week','month'].includes(period)) throw new Error('MALFORMED');
  if(!Array.isArray(r.top)||!Array.isArray(r.around)) throw new Error('MALFORMED');
  return {
    metric, period, minUsers:num(r.min_users), schoolCount:num(r.school_count),
    mySchool:r.my_school===null?null:parseRow(r.my_school),
    top:(r.top as unknown[]).map(parseRow),
    around:(r.around as unknown[]).map(parseRow),
    asOf:str(r.as_of),
  };
}

/** Guarded: returns null if the RPC is missing/errors (UI shows a prepared empty state). */
export async function readSchoolCard(client:SupabaseClient):Promise<SchoolCard|null>{
  try{ const {data,error}=await client.rpc('student_school_card'); if(error) return null; return parseSchoolCard(data); }
  catch{ return null; }
}
export async function readSchoolRanking(client:SupabaseClient, metric:SchoolRankMetric, period:SchoolRankPeriod, minUsers=5):Promise<SchoolRanking|null>{
  try{ const {data,error}=await client.rpc('student_school_ranking',{p_period:period,p_metric:metric,p_min_users:minUsers}); if(error) return null; return parseSchoolRanking(data); }
  catch{ return null; }
}
