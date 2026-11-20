import type { SupabaseClient } from '@supabase/supabase-js';
import { assertOwner } from './data';

export const admissionEventLabels = {
  ESSAY: '논술고사', INTERVIEW: '면접고사', PRACTICAL: '실기고사',
  STAGE_RESULT: '1단계 합격자 발표', INITIAL_RESULT: '최초 합격자 발표',
  REGISTRATION_DEADLINE: '등록 마감', OTHER: '기타 공식 일정',
} as const;
export type AdmissionEventType = keyof typeof admissionEventLabels;
export type AdmissionDayEvent = {
  official_event_id: string; day_target_id: string | null; title: string;
  university_name: string; event_type: AdmissionEventType; event_date: string | null;
  event_time: string | null; status: 'ACTIVE' | 'DISMISSED' | 'CANCELLED';
  source_url: string | null; source_note: string; revision: number;
  can_restore: boolean; unavailable_reason: string | null; updated_at: string;
};
export type ScheduleErrorKind = 'ACCOUNT_CHANGED' | 'UNAVAILABLE' | 'FORBIDDEN' | 'CHANGED' | 'INVALID' | 'NETWORK' | 'AMBIGUOUS_SCOPE' | 'DUPLICATE_SCOPE' | 'IMMUTABLE_IDENTITY';
export class ScheduleError extends Error {
  constructor(readonly kind: ScheduleErrorKind) { super(kind); }
}
export function unavailableScheduleCopy(reason: string | null): string {
  switch (reason) {
    case 'SOURCE_PENDING': return '공식 일정을 확인하고 있습니다.';
    case 'SOURCE_CANCELLED': return '공식 일정이 취소되었습니다.';
    case 'NOT_PUBLISHED': return '아직 공개되지 않은 일정입니다.';
    case 'APPLICATION_NOT_MATCHED': return '현재 지원 기록과 연결되지 않는 일정입니다.';
    case 'PAST_EVENT': return '이미 지난 일정은 복원할 수 없습니다.';
    default: return '현재 지원 정보와 공식 일정을 확인한 뒤 복원할 수 있습니다.';
  }
}
export function scheduleErrorCopy(error: unknown): string {
  switch (error instanceof ScheduleError ? error.kind : error instanceof Error && error.message === 'ACCOUNT_CHANGED' ? 'ACCOUNT_CHANGED' : 'NETWORK') {
    case 'ACCOUNT_CHANGED': return '로그인 계정이 변경되었습니다. 새로고침 후 다시 확인해 주세요.';
    case 'UNAVAILABLE': return '입시 일정 연결 기능을 준비 중입니다. 기존 지원 기록과 수동 D-Day는 유지됩니다.';
    case 'FORBIDDEN': return '이 일정을 관리할 권한이 없습니다. 로그인 계정을 확인해 주세요.';
    case 'CHANGED': return '다른 화면에서 일정이 변경되었습니다. 목록을 새로고침하고 다시 확인해 주세요.';
    case 'INVALID': return '일정의 날짜, 적용 대상, 공식 출처와 검증 상태를 확인해 주세요.';
    case 'AMBIGUOUS_SCOPE': return '같은 전형·모집단위가 여러 캠퍼스와 겹칩니다. 캠퍼스를 구분할 수 있도록 적용 대상을 확인해 주세요.';
    case 'DUPLICATE_SCOPE': return '같은 대상의 공식 일정이 이미 있습니다. 삭제 상태를 보존하도록 신규 등록 대신 기존 일정을 수정해 주세요.';
    case 'IMMUTABLE_IDENTITY': return '저장된 일정의 대학·학년도·캠퍼스·유형은 변경할 수 없습니다. 날짜와 적용 범위를 확인해 주세요.';
    default: return '일정을 처리하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.';
  }
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ScheduleError('INVALID');
  return value as Record<string, unknown>;
}
export function text(value: unknown): string {
  if (typeof value !== 'string') throw new ScheduleError('INVALID');
  return value;
}
export function dateOnly(value: unknown): string | null {
  if (value === null) return null;
  const date = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new ScheduleError('INVALID');
  return date;
}
export function sourceUrl(value: unknown): string | null {
  if (value === null || value === '') return null;
  const url = text(value);
  try { const parsed = new URL(url); if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(); }
  catch { throw new ScheduleError('INVALID'); }
  return url;
}
export function positiveRevision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new ScheduleError('INVALID');
  return value as number;
}
export function parseAdmissionDayEvent(value: unknown): AdmissionDayEvent {
  const row = record(value), kind = text(row.event_type), status = text(row.status);
  if (!Object.hasOwn(admissionEventLabels, kind) || !['ACTIVE', 'DISMISSED', 'CANCELLED'].includes(status) || typeof row.can_restore !== 'boolean') throw new ScheduleError('INVALID');
  const event_date = dateOnly(row.event_date), day_target_id = row.day_target_id === null ? null : text(row.day_target_id);
  if (status === 'ACTIVE' && (!day_target_id || !event_date)) throw new ScheduleError('INVALID');
  return {
    official_event_id: text(row.official_event_id), day_target_id, title: text(row.title), university_name: text(row.university_name),
    event_type: kind as AdmissionEventType, event_date, event_time: row.event_time == null ? null : text(row.event_time),
    status: status as AdmissionDayEvent['status'], source_url: sourceUrl(row.source_url), source_note: row.source_note == null ? '' : text(row.source_note),
    revision: positiveRevision(row.revision), can_restore: row.can_restore,
    unavailable_reason: row.unavailable_reason == null ? null : text(row.unavailable_reason), updated_at: text(row.updated_at),
  };
}
export function parseAdmissionDayEvents(value: unknown): AdmissionDayEvent[] {
  const rows = record(value).events;
  if (!Array.isArray(rows)) throw new ScheduleError('INVALID');
  const events = rows.map(parseAdmissionDayEvent);
  if (new Set(events.map(event => event.official_event_id)).size !== events.length) throw new ScheduleError('INVALID');
  return events;
}
export async function admissionRpc(client: SupabaseClient, owner: string, name: string, args?: Record<string, unknown>): Promise<unknown> {
  await assertOwner(client, owner);
  let result;
  try { result = await client.rpc(name, args); } catch { throw new ScheduleError('NETWORK'); }
  await assertOwner(client, owner);
  if (result.error) {
    const code = result.error.code;
    const reason = result.error.message ?? '';
    if (reason.includes('AMBIGUOUS_CAMPUS_SCOPE')) throw new ScheduleError('AMBIGUOUS_SCOPE');
    if (reason.includes('DUPLICATE_EVENT_SCOPE_USE_EXISTING')) throw new ScheduleError('DUPLICATE_SCOPE');
    if (reason.includes('EVENT_IDENTITY_IMMUTABLE')) throw new ScheduleError('IMMUTABLE_IDENTITY');
    if (['PGRST202', '42883'].includes(code)) throw new ScheduleError('UNAVAILABLE');
    if (['42501', 'PT401', 'PT403'].includes(code)) throw new ScheduleError('FORBIDDEN');
    if (['40001', 'PT409'].includes(code)) throw new ScheduleError('CHANGED');
    if (['23514', '22023', '22P02', 'PT422'].includes(code)) throw new ScheduleError('INVALID');
    throw new ScheduleError('NETWORK');
  }
  return result.data;
}
export async function readAdmissionDayEvents(client: SupabaseClient, owner: string) {
  return parseAdmissionDayEvents(await admissionRpc(client, owner, 'my_admission_day_events'));
}
export async function actOnAdmissionDayEvent(client: SupabaseClient, owner: string, event: AdmissionDayEvent, action: 'dismiss' | 'restore', requestKey: string) {
  return parseAdmissionDayEvent(await admissionRpc(client, owner, 'my_admission_day_event_action', {
    p_event_id: event.official_event_id, p_action: action, p_expected_revision: event.revision, p_request_key: requestKey,
  }));
}
/** Calendar dates remain KST dates; no browser-local midnight conversion. */
export function admissionDayLabel(date: string, now = new Date()): string {
  const today = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
  const days = Math.round((Date.parse(date) - Date.parse(today)) / 86400000);
  return days < 0 ? '지난 일정' : days === 0 ? 'D-DAY' : `D-${days}`;
}
export const ADMISSION_SCHEDULES_CHANGED = 'admission-schedules-changed';
export function notifyAdmissionSchedulesChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ADMISSION_SCHEDULES_CHANGED));
}
