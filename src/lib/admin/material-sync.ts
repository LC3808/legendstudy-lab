import type { SupabaseClient } from '@supabase/supabase-js';
import { mapRpcError } from './errors';
export type SyncRun = {id:string;trigger_name:string;status:string;requested_at:string;started_at:string|null;finished_at:string|null;summary:{counts?:Record<string,number>;metrics?:Record<string,number>;error_code?:string;failure_reasons?:Record<string,number>}|null};
export type SyncStatus = {version:'material-sync-v1';enabled:boolean;interval_hours:72;next_due_at:string;next_retry_at:string|null;last_success_at:string|null;last_completed_at:string|null;last_poll_at:string|null;runs:SyncRun[];issues:{post_id:string;status:string;error_code:string;observed_at:string}[]};
export async function syncStatus(client:Pick<SupabaseClient,'rpc'>):Promise<SyncStatus>{
 const {data,error}=await client.rpc('admin_material_sync_status');if(error)throw mapRpcError(error);
 if(data?.version!=='material-sync-v1'||data.interval_hours!==72||!Array.isArray(data.runs)||!Array.isArray(data.issues))throw Error('동기화 응답을 확인할 수 없습니다.');
 return data;
}
export async function requestSync(client:Pick<SupabaseClient,'rpc'>):Promise<{accepted:boolean;status:string}>{
 const {data,error}=await client.rpc('admin_material_sync_request');if(error)throw mapRpcError(error);
 if(typeof data?.accepted!=='boolean'||!['queued','running'].includes(data.status))throw Error('갱신 요청 응답을 확인할 수 없습니다.');
 return data;
}
export const syncState:Record<string,string>={queued:'실행 대기',running:'실행 중',success:'완료',partial:'일부 보류·실패',failed:'실행 실패',interrupted:'실행 중단',rolled_back:'원복'};
export function syncTime(value:string|null){return value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'medium'}).format(new Date(value)):'기록 없음';}
export const syncReasons:Record<string,string>={unsupported_attachment_provider:'첨부 제공 방식 검토',provider_query_review:'첨부 URL 매개변수 검토',duplicate_attachment_identity:'동일 첨부 식별 정보 중복',classification_review:'자료 분류 검토',historical_backfill_excluded:'과거 미등록 자료 자동 공개 제외',parent_publication_hold:'비공개 게시글 유지',subject_mapping_changed:'과목 매핑 변경 검토',resource_scope_changed:'첨부 연결 변경 검토',FetchError:'원본 사이트 조회 실패',TimeoutError:'원본 응답 시간 초과',InsufficientPrivilege:'DB 실행 권한 확인 필요',UniqueViolation:'중복 자료 식별 확인 필요'};
