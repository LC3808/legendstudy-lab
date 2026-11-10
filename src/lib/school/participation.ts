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
      registeredUsers:number;   // 학교를 등록한 유효 가입 학생 수 (1명부터 공개)
      activeUsers7d:number;      // 최근 7일 공부시간 기록자 수
      minRecorders:number;      // 공개 소표본 하한(기록자 수)
      weekRecorders:number;     // 이번 주 공부시간 기록자 수
      recordersNeeded:number;   // 랭킹 공개까지 더 필요한 기록자 수 (0이면 공개 기준 충족)
      weekMs:number|null;       // 이번 주 총 공부시간(ms). 기록자 < minRecorders면 null(랭킹 잠금)
      rank:number|null;         // 이번 주 총공부시간 전국 순위 (잠금 시 null)
      asOf:string;
    };

export type SchoolRankMetric = 'total' | 'average' | 'participation';
export type SchoolRankPeriod = 'week' | 'last_week' | 'month' | 'all';
export type SchoolRankRow = {
  officeCode:string; schoolCode:string;
  // registeredUsers (가입) and activeUsers (참여) are null for schools other than the
  // caller's own school (privacy); null ≠ 0.
  registeredUsers:number|null; activeUsers:number|null;
  // ms/avgMs are null for schools below the public min-recorder threshold (k-anonymity).
  ms:number|null; avgMs:number|null;
  // rank is the tie-aware rank number (ties share a number); not the display row index.
  rank:number;
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
  return {officeCode:str(r.office_code), schoolCode:str(r.school_code), registeredUsers:nnum(r.registered_users), activeUsers:nnum(r.active_users), ms:nnum(r.ms), avgMs:nnum(r.avg_ms), rank:num(r.rank)};
}

export function parseSchoolCard(raw:unknown):SchoolCard{
  const r=obj(raw);
  if(r.version!=='student-school-card-v1') throw new Error('MALFORMED');
  if(r.has_school!==true) return {hasSchool:false};
  return {
    hasSchool:true,
    officeCode:str(r.office_code), schoolCode:str(r.school_code),
    registeredUsers:num(r.registered_users), activeUsers7d:num(r.active_users_7d),
    minRecorders:num(r.min_recorders), weekRecorders:num(r.week_recorders),
    recordersNeeded:num(r.recorders_needed),
    weekMs:nnum(r.week_ms), rank:nnum(r.rank), asOf:str(r.as_of),
  };
}

export function parseSchoolRanking(raw:unknown):SchoolRanking{
  const r=obj(raw);
  if(r.version!=='student-school-ranking-v1') throw new Error('MALFORMED');
  const metric=str(r.metric) as SchoolRankMetric;
  if(!['total','average','participation'].includes(metric)) throw new Error('MALFORMED');
  const period=str(r.period) as SchoolRankPeriod;
  if(!['week','last_week','month','all'].includes(period)) throw new Error('MALFORMED');
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
// Public thresholds (3 recorders / 5 for average) are enforced server-side and are
// NOT client parameters, so the call cannot lower them.
export async function readSchoolRanking(client:SupabaseClient, metric:SchoolRankMetric, period:SchoolRankPeriod):Promise<SchoolRanking|null>{
  try{ const {data,error}=await client.rpc('student_school_ranking',{p_period:period,p_metric:metric}); if(error) return null; return parseSchoolRanking(data); }
  catch{ return null; }
}
