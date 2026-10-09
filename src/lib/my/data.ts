import {formatUserCreditReason} from '@/lib/credit-display';
import {lookupSchoolName} from '@/lib/admin/school';
import type { SupabaseClient } from '@supabase/supabase-js';
export type Target = { id: string; university_id: string; intended_division: string | null; universities: { name: string } | null };
export type Goals = { intended_major: string | null; targets: Target[] };
export const majorOptions = ['인문·어학','사회·상경','자연·이학','공학','의약·보건','교육','예체능','자유전공·융합'];
export async function assertOwner(client: SupabaseClient, owner: string) {
  const { data } = await client.auth.getSession();
  if (data.session?.user.id !== owner) throw new Error('ACCOUNT_CHANGED');
}
function checked<T>(response: { data: T; error: unknown }): T {
  if (response.error) throw new Error('READ_FAILED');
  return response.data;
}
/** Shared APP profile. Never overwrite an existing row, including concurrent APP setup. */
export async function ensureOwnerProfile(client: SupabaseClient, owner: string) {
  await assertOwner(client, owner);
  const existing = checked(await client.from('profiles').select('id').eq('id',owner).maybeSingle());
  if (existing) return;
  await assertOwner(client, owner);
  checked(await client.from('profiles').upsert({id:owner}, {onConflict:'id',ignoreDuplicates:true}));
  await assertOwner(client, owner);
}
export async function readGoals(client: SupabaseClient, owner: string): Promise<Goals> {
  await assertOwner(client, owner);
  const [profile, targets] = await Promise.all([
    client.from('profiles').select('intended_major').eq('id',owner).maybeSingle(),
    client.from('student_target_universities').select('id,university_id,intended_division,universities(name)').eq('user_id',owner).eq('status','interested').order('created_at').limit(100),
  ]);
  return { intended_major: checked(profile)?.intended_major ?? null, targets: checked(targets) as unknown as Target[] };
}
export async function saveMajor(client: SupabaseClient, owner: string, value: string) {
  await assertOwner(client,owner);
  if (value && !majorOptions.includes(value)) throw new Error('INVALID_MAJOR');
  await ensureOwnerProfile(client,owner);
  checked(await client.from('profiles').update({ intended_major: value || null }).eq('id',owner).select('id').single());
  await assertOwner(client,owner);
}
export async function searchUniversities(client: SupabaseClient, owner: string, query: string) {
  await assertOwner(client,owner);
  const clean=query.trim().replace(/[%_\\]/g,'');
  if (!clean) return [];
  return checked(await client.from('universities').select('id,name').eq('is_active',true).ilike('name',`%${clean}%`).order('name').limit(20)) as {id:string;name:string}[];
}
export async function addTarget(client: SupabaseClient, owner: string, university: string) {
  await ensureOwnerProfile(client,owner);
  checked(await client.from('student_target_universities').insert({user_id:owner,university_id:university,status:'interested',source:'my'}));
  await assertOwner(client,owner);
}
export async function editTarget(client: SupabaseClient, owner: string, id: string, division: string | null) {
  await assertOwner(client,owner);
  if (division !== null && division.trim().length > 120) throw new Error('INVALID_DIVISION');
  const q=client.from('student_target_universities');
  checked(await (division===null ? q.delete() : q.update({intended_division:division.trim() || null}))
    .eq('id',id).eq('user_id',owner).eq('status','interested').select('id').single());
  await assertOwner(client,owner);
}
export type Transaction = {id:string;decision_id:string|null;transaction_type:string;balance_delta:number;created_at:string;credit_grants?:{origin:string}|null;reason_code?:string|null;actor_reference?:string|null};
export type Decision = {id:string;credits_required:number;status:string;created_at:string};
export type HistoryRow = {id:string;label:string;delta:number;at:string};
export function historyRows(transactions:Transaction[],decisions:Decision[]):HistoryRow[] {
  const rows:HistoryRow[]=[];const consumes=new Map<string,HistoryRow>();
  for(const t of transactions){
    if(t.transaction_type==='reserve'||t.transaction_type==='release')continue;
    if(t.transaction_type==='consume'&&t.decision_id){
      const row=consumes.get(t.decision_id)??{id:t.decision_id,label:'논술 첨삭 이용',delta:0,at:t.created_at};
      row.delta+=t.balance_delta;consumes.set(t.decision_id,row);continue;
    }
    rows.push({id:t.id,label:formatUserCreditReason(t.transaction_type,t.reason_code),delta:t.balance_delta,at:t.created_at});
  }
  rows.push(...consumes.values());
  for(const d of decisions)if(d.status==='settled'&&d.credits_required===0&&!consumes.has(d.id)) rows.push({id:d.id,label:'추가 차감 없는 첨삭',delta:0,at:d.created_at});
  return rows.sort((a,b)=>b.at.localeCompare(a.at));
}
export async function readHistory(client:SupabaseClient,owner:string):Promise<HistoryRow[]> {
  await assertOwner(client,owner);
  const account=checked(await client.from('credit_accounts').select('id').eq('user_id',owner).maybeSingle());
  if(!account)return [];
  const [tx,decisions]=await Promise.all([
    client.from('credit_transactions').select('id,decision_id,transaction_type,balance_delta,created_at,reason_code').eq('account_id',account.id).not('transaction_type','in','(reserve,release)').order('created_at',{ascending:false}).limit(200),
    client.from('essay_billing_decisions').select('id,credits_required,status,created_at').eq('account_id',account.id).eq('credits_required',0).eq('status','settled').order('created_at',{ascending:false}).limit(100),
  ]);
  const transactions=checked(tx) as unknown as Transaction[];
  // Complete every selected consume decision, even if a multi-grant event crosses the page boundary.
  const ids=[...new Set(transactions.filter(t=>t.transaction_type==='consume'&&t.decision_id).map(t=>t.decision_id!))];
  const complete=ids.length ? checked(await client.from('credit_transactions').select('id,decision_id,transaction_type,balance_delta,created_at').eq('account_id',account.id).eq('transaction_type','consume').in('decision_id',ids).limit(1000)) as Transaction[] : [];
  if(complete.length===1000)throw new Error('HISTORY_LIMIT');
  return historyRows([...transactions.filter(t=>t.transaction_type!=='consume'),...complete],checked(decisions) as Decision[]).slice(0,100);
}
export type Evaluation={id:string;attempt_id?:string;session_id:string;status:string;requested_at:string;completed_at:string|null;invalidated_at:string|null;regime_key:string;essay_evaluation_dimensions:{level_1_to_5:number|null;explanation:string;display_order:number}[]};
export type EssayRecord={id:string;created_at:string;essay_questions:{label:string;essay_exams:{admission_year:number;universities:{name:string}|null}|null}|null;evaluations:Evaluation[]};
export async function readEssays(client:SupabaseClient,owner:string):Promise<EssayRecord[]> {
  await assertOwner(client,owner);
  const sessions=checked(await client.from('essay_practice_sessions').select('id,created_at,essay_questions(label,essay_exams(admission_year,universities(name)))').eq('user_id',owner).order('created_at',{ascending:false}).limit(50)) as unknown as Omit<EssayRecord,'evaluations'>[];
  if(!sessions.length)return [];
  const evaluations=checked(await client.from('essay_evaluations').select('id,attempt_id,session_id,status,requested_at,completed_at,invalidated_at,regime_key,essay_evaluation_dimensions(level_1_to_5,explanation,display_order)').in('session_id',sessions.map(s=>s.id)).order('requested_at',{ascending:false}).limit(1000)) as unknown as Evaluation[];
  if(evaluations.length===1000)throw new Error('HISTORY_LIMIT');
  return sessions.map(s=>({...s,evaluations:evaluations.filter(e=>e.session_id===s.id)}));
}

export type MyProfile = { display_name?: string | null; neis_office_code: string | null; neis_school_code: string | null; academic_status: string | null; grade_level: number | null };
export async function readMyProfile(client: SupabaseClient, owner: string): Promise<MyProfile> {
  await assertOwner(client, owner);
  const profile = checked(await client.from('profiles').select('display_name,neis_office_code,neis_school_code,academic_status,grade_level').eq('id',owner).maybeSingle());
  await assertOwner(client, owner);
  return profile ?? {neis_office_code:null,neis_school_code:null,academic_status:null,grade_level:null};
}

export async function saveMyProfile(client: SupabaseClient, owner: string, profile: MyProfile) {
  const {neis_office_code:office,neis_school_code:school,academic_status:status,grade_level:grade}=profile;
  if ((office===null)!==(school===null) || [office,school].some(v=>v!==null&&(!v.trim()||v!==v.trim()||v.length>32))) throw new Error('INVALID_SCHOOL');
  if (status!==null&&!['student','retaker','other'].includes(status)) throw new Error('INVALID_STATUS');
  if (grade!==null&&![1,2,3].includes(grade)) throw new Error('INVALID_GRADE');
  await assertOwner(client,owner);
  if (office && school && !await lookupSchoolName(office,school,AbortSignal.timeout(15000))) throw new Error('INVALID_SCHOOL');
  await ensureOwnerProfile(client,owner);
  checked(await client.from('profiles').update({neis_office_code:office,neis_school_code:school,academic_status:school?'student':status==='student'?null:status,grade_level:school?grade:null}).eq('id',owner).select('id').single());
  await assertOwner(client,owner);
}
