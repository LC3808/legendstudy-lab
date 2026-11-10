// Phase 3 friend-invite / conversion-tracking data contract + guarded client wrappers.
// The invite RPCs are a candidate (not yet applied), so every reader is guarded: on any
// error or missing RPC it returns a null/empty result and the UI degrades gracefully —
// never fabricated data, never a crash. No internal UUID/email is ever put in a URL.
import type {SupabaseClient} from '@supabase/supabase-js';

export type InviteLink = {token:string; path:string; campaign:string; expiresAt:string; hasSchool:boolean};
export type InviteLookup =
  | {valid:false; reason:'invalid'|'not_found'|'revoked'|'expired'|'error'}
  | {valid:true; officeCode:string|null; schoolCode:string|null; hasSchool:boolean; campaign:string};
export type InviteAttribution = {attributed:boolean; reason:string; officeCode?:string|null; schoolCode?:string|null; hasSchool?:boolean};
export type InvitePerformance = {tokens:number; visits:number; signups:number; firstStudy:number; d7Retained:number};

function obj(v:unknown):Record<string,unknown>{ if(!v||typeof v!=='object'||Array.isArray(v)) throw new Error('MALFORMED'); return v as Record<string,unknown>; }
function num(v:unknown):number{ if(typeof v!=='number'||!Number.isFinite(v)) throw new Error('MALFORMED'); return v; }
function str(v:unknown):string{ if(typeof v!=='string') throw new Error('MALFORMED'); return v; }
function nstr(v:unknown):string|null{ return v==null?null:str(v); }

const TOKEN_RE=/^[0-9a-f]{64}$/;
export function isInviteToken(t:unknown):t is string{ return typeof t==='string' && TOKEN_RE.test(t); }

export function parseInviteLookup(raw:unknown):InviteLookup{
  const r=obj(raw);
  if(r.valid!==true) return {valid:false, reason:(['invalid','not_found','revoked','expired'].includes(String(r.reason))?String(r.reason):'error') as 'invalid'};
  return {valid:true, officeCode:nstr(r.office_code), schoolCode:nstr(r.school_code), hasSchool:r.has_school===true, campaign:str(r.campaign)};
}
export function parseInvitePerformance(raw:unknown):InvitePerformance{
  const r=obj(raw);
  return {tokens:num(r.tokens), visits:num(r.visits), signups:num(r.signups), firstStudy:num(r.first_study), d7Retained:num(r.d7_retained)};
}

/** Opaque per-device visitor id (random, not PII) for visit dedup. Stored in localStorage. */
export function visitorId():string{
  const KEY='ls_invite_visitor';
  try{
    const s=globalThis.localStorage; const cur=s?.getItem(KEY);
    if(cur&&cur.length>=8) return cur;
    const id=(globalThis.crypto?.randomUUID?.()??`v${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/-/g,'');
    s?.setItem(KEY,id); return id;
  }catch{ return `v${Date.now()}${Math.random().toString(36).slice(2)}`.replace(/-/g,''); }
}

const PENDING_KEY='ls_invite_pending_token';
/** Remember the invite token across signup (per device). Only an opaque token, no PII. */
export function rememberPendingInvite(token:string){ try{ if(isInviteToken(token)) globalThis.localStorage?.setItem(PENDING_KEY,token); }catch{/* ignore */} }
export function readPendingInvite():string|null{ try{ const t=globalThis.localStorage?.getItem(PENDING_KEY); return isInviteToken(t)?t:null; }catch{ return null; } }
export function clearPendingInvite(){ try{ globalThis.localStorage?.removeItem(PENDING_KEY); }catch{/* ignore */} }

/** Public landing base; the full invite URL carries only the opaque token. */
export const INVITE_ORIGIN='https://lab.legendstudy.com';
export function inviteUrl(token:string):string{ return `${INVITE_ORIGIN}/invite/?t=${token}`; }

// ---- Guarded client wrappers (RPC may be absent → null/degraded, never throw) ----
export async function createInvite(client:SupabaseClient, campaign='school_rank'):Promise<InviteLink|null>{
  try{ const {data,error}=await client.rpc('invite_create',{p_campaign:campaign}); if(error) return null;
    const r=obj(data); const token=str(r.token); if(!isInviteToken(token)) return null;
    return {token, path:str(r.path), campaign:str(r.campaign), expiresAt:str(r.expires_at), hasSchool:r.has_school===true}; }
  catch{ return null; }
}
export async function lookupInvite(client:SupabaseClient, token:string):Promise<InviteLookup>{
  if(!isInviteToken(token)) return {valid:false, reason:'invalid'};
  try{ const {data,error}=await client.rpc('invite_lookup',{p_token:token}); if(error) return {valid:false, reason:'error'}; return parseInviteLookup(data); }
  catch{ return {valid:false, reason:'error'}; }
}
export async function recordInviteVisit(client:SupabaseClient, token:string, source='web'):Promise<void>{
  try{ if(isInviteToken(token)) await client.rpc('invite_record_visit',{p_token:token, p_visitor:visitorId(), p_source:source}); }catch{/* best-effort */}
}
export async function attributeSignup(client:SupabaseClient, token:string):Promise<InviteAttribution|null>{
  if(!isInviteToken(token)) return null;
  try{ const {data,error}=await client.rpc('invite_attribute_signup',{p_token:token}); if(error) return null;
    const r=obj(data); return {attributed:r.attributed===true, reason:str(r.reason), officeCode:nstr(r.office_code), schoolCode:nstr(r.school_code), hasSchool:r.has_school===true}; }
  catch{ return null; }
}
export async function markSchoolConfirmed(client:SupabaseClient):Promise<void>{
  try{ await client.rpc('invite_mark_school_confirmed'); }catch{/* best-effort */}
}
export async function refreshMilestones(client:SupabaseClient):Promise<void>{
  try{ await client.rpc('invite_refresh_milestones'); }catch{/* best-effort */}
}
export async function readMyInvitePerformance(client:SupabaseClient):Promise<InvitePerformance|null>{
  try{ const {data,error}=await client.rpc('invite_my_performance'); if(error) return null; return parseInvitePerformance(data); }
  catch{ return null; }
}
