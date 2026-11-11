import { AdminError } from './errors';

export const withdrawalStatuses = {
  pending: '탈퇴 대기', processing: '삭제 처리 중', failed: '처리 오류', completed: '삭제 완료', cancelled: '요청 취소',
} as const;
export type WithdrawalStatus = keyof typeof withdrawalStatuses;
export type WithdrawalFilters = { query: string; status: '' | WithdrawalStatus; sort: 'newest' | 'oldest' };
export const withdrawalDefaults: WithdrawalFilters = { query: '', status: '', sort: 'newest' };
export type WithdrawalRow = {
  request_id: string; account_id: string | null; joined_at: string | null;
  requested_at: string; scheduled_deletion_at: string; completed_at: string | null;
  state: string; phase: string; status: WithdrawalStatus; data_state: string;
};
export type WithdrawalCursor = {as_of:string;requested_at:string|null;request_id:string|null};
export type WithdrawalList = {
  next_cursor: WithdrawalCursor|null;
  as_of: string; total: number; limit: number; offset: number;
  kpis: { pending: number; processing: number; failed: number; completed30: number | null };
  items: WithdrawalRow[];
};
export const activityCounts = ['study_ms','study_sessions','study_days','mock_submissions','mock_exams','mock_scores','essay_requests','essay_completed','essay_rewrites','credits_consumed','credits_paid','credits_free','credits_other','viewed_materials','bookmarks','targets','applications','outcome_applications','invite_links','invite_signups','invite_first_study'] as const;
export const activityDates = ['study_last','mock_last','essay_last','material_last','last_activity'] as const;
export type WithdrawalActivity = Record<typeof activityCounts[number], number> & Record<typeof activityDates[number], string | null> & {material_views: number | null};
export type WithdrawalDetail = {
  request_id: string; as_of: string; state: string; phase: string;
  requested_at: string; scheduled_deletion_at: string; started_at: string | null;
  completed_at: string | null; cancelled_at: string | null; expires_at: string | null;
  retry_count: number; next_attempt_at: string | null; error: string | null;
  identity: { account_id: string; joined_at: string; grade: number | null; academic_status: string | null; school_set: boolean } | null;
  activity: WithdrawalActivity | null;
};
export const withdrawalErrors: Record<string,string> = {
  STORAGE_UNAVAILABLE:'파일 저장소 확인 실패', PROVIDER_EXTERNAL_GATE:'외부 서비스 연결 해제 확인 필요',
  FINANCE_EXTERNAL_GATE:'원장 개인정보 분리 확인 필요', AUTH_UNAVAILABLE:'인증 계정 처리 확인 실패',
  POSTCONDITION_FAILED:'삭제 후 확인 실패', TRANSPORT_UNAVAILABLE:'처리 서비스 연결 실패',
  RESTORE_CHECKPOINT_UNAVAILABLE:'복구 점검 기록 확인 실패', PROCESSING_ERROR:'처리 오류 확인 필요',
};
const fail = (): never => { throw new AdminError('MALFORMED_RESPONSE'); };
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : fail();
const str = (v: unknown): string => typeof v === 'string' ? v : fail();
const num = (v: unknown): number => Number.isSafeInteger(v) && Number(v) >= 0 ? Number(v) : fail();
const date = (v: unknown): string => Number.isFinite(Date.parse(str(v))) ? str(v) : fail();
const maybeDate = (v: unknown): string | null => v === null ? null : date(v);
const id = (v: unknown): string => /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(str(v)) ? str(v) : fail();
const state = (v: unknown): string => ['DELETION_PENDING','ERASING','ERASED','CANCELLED'].includes(str(v)) ? str(v) : fail();
const phase = (v: unknown): string => ['PERSONAL','STORAGE','PROVIDER','FINANCE','AUTH','VERIFY','DONE'].includes(str(v)) ? str(v) : fail();
export function parseWithdrawalList(value: unknown): WithdrawalList {
  const r=object(value), k=object(r.kpis);
  if(r.version!=='admin-withdrawals-v1' || !Array.isArray(r.items)) fail();
  const total=num(r.total),limit=num(r.limit),offset=num(r.offset);
  if(limit<1 || limit>50 || (r.items as unknown[]).length>limit) fail();
  const items=(r.items as unknown[]).map(v=>{
    const a=object(v), status=str(a.status) as WithdrawalStatus, dataState=str(a.data_state);
    if(!Object.hasOwn(withdrawalStatuses,status) || !['retained','erasing','erased','cancelled'].includes(dataState)) fail();
    const s=state(a.state), accountId=a.account_id===null?null:id(a.account_id), joinedAt=maybeDate(a.joined_at);
    if(['ERASED','CANCELLED'].includes(s) && (accountId!==null || joinedAt!==null)) fail();
    return {request_id:id(a.request_id),account_id:accountId,joined_at:joinedAt,requested_at:date(a.requested_at),scheduled_deletion_at:date(a.scheduled_deletion_at),completed_at:maybeDate(a.completed_at),state:s,phase:phase(a.phase),status,data_state:dataState};
  });
  if(items.length>total || new Set(items.map(x=>x.request_id)).size!==items.length) fail();
  const cursor=r.next_cursor===null?null:object(r.next_cursor);
  const next_cursor=cursor?{as_of:date(cursor.as_of),requested_at:date(cursor.requested_at),request_id:id(cursor.request_id)}:null;
  return {as_of:date(r.as_of),next_cursor,total,limit,offset,kpis:{pending:num(k.pending),processing:num(k.processing),failed:num(k.failed),completed30:k.completed30===null?null:num(k.completed30)},items};
}
export function parseWithdrawalDetail(value: unknown): WithdrawalDetail {
  const r=object(value);
  if(r.version!=='admin-withdrawal-detail-v1') fail();
  const s=state(r.state);
  if(s!=='DELETION_PENDING' && (r.identity!==null || r.activity!==null)) fail();
  let identity: WithdrawalDetail['identity']=null;
  if(r.identity!==null){
    const v=object(r.identity); const grade=v.grade===null?null:num(v.grade);
    if(typeof v.school_set!=='boolean' || (grade!==null && ![1,2,3].includes(grade))) fail();
    const academic=v.academic_status===null?null:str(v.academic_status);
    if(academic!==null && !['student','retaker','other'].includes(academic)) fail();
    identity={account_id:id(v.account_id),joined_at:date(v.joined_at),grade,academic_status:academic,school_set:v.school_set as boolean};
  }
  let activity: WithdrawalActivity|null=null;
  if(r.activity!==null){
    if(identity===null) fail();
    const v=object(r.activity);
    activity={...Object.fromEntries(activityCounts.map(k=>[k,num(v[k])])),...Object.fromEntries(activityDates.map(k=>[k,maybeDate(v[k])])),material_views:v.material_views===null?null:num(v.material_views)} as WithdrawalActivity;
  }
  const error=r.error===null?null:str(r.error); if(error!==null && !Object.hasOwn(withdrawalErrors,error)) fail();
  return {request_id:id(r.request_id),as_of:date(r.as_of),state:s,phase:phase(r.phase),requested_at:date(r.requested_at),scheduled_deletion_at:date(r.scheduled_deletion_at),started_at:maybeDate(r.started_at),completed_at:maybeDate(r.completed_at),cancelled_at:maybeDate(r.cancelled_at),expires_at:maybeDate(r.expires_at),retry_count:num(r.retry_count),next_attempt_at:maybeDate(r.next_attempt_at),error,identity,activity};
}
