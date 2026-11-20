import type { SupabaseClient } from '@supabase/supabase-js';
import { admissionEventLabels, admissionRpc, dateOnly, positiveRevision, record, ScheduleError, sourceUrl, text, type AdmissionEventType } from '@/lib/my/admission-day-events';

export type AdmissionScheduleInput = {
  university_id: string; academic_year: number; campus: string; title: string;
  event_type: AdmissionEventType; event_date: string | null; event_time: string | null;
  admission_names: string[]; division_names: string[]; source_url: string | null;
  source_sha256: string | null; source_page: number | null; source_note: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'CANCELLED'; is_published: boolean;
};
export type AdmissionSchedule = AdmissionScheduleInput & { id: string; revision: number; university_name: string; updated_at?: string };
export type AdmissionSchedules = { schedules: AdmissionSchedule[]; universities: { id: string; name: string }[] };
function scope(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim())) throw new ScheduleError('INVALID');
  return value as string[];
}
export function parseAdmissionSchedule(value: unknown): AdmissionSchedule {
  const row = record(value), kind = text(row.event_type), state = text(row.verification_status);
  if (!Object.hasOwn(admissionEventLabels, kind) || !['PENDING', 'VERIFIED', 'CANCELLED'].includes(state) || typeof row.is_published !== 'boolean' || !Number.isSafeInteger(row.academic_year)) throw new ScheduleError('INVALID');
  return {
    id: text(row.id), revision: positiveRevision(row.revision), university_id: text(row.university_id),
    university_name: row.university_name == null ? '' : text(row.university_name), academic_year: row.academic_year as number,
    campus: text(row.campus), title: text(row.title), event_type: kind as AdmissionEventType,
    event_date: dateOnly(row.event_date), event_time: row.event_time == null ? null : text(row.event_time),
    admission_names: scope(row.admission_names), division_names: scope(row.division_names), source_url: sourceUrl(row.source_url),
    source_sha256: row.source_sha256 == null ? null : text(row.source_sha256), source_page: row.source_page == null ? null : positiveRevision(row.source_page),
    source_note: row.source_note == null ? '' : text(row.source_note), verification_status: state as AdmissionSchedule['verification_status'], is_published: row.is_published,
    updated_at: row.updated_at == null ? undefined : text(row.updated_at),
  };
}
export function parseAdmissionSchedules(value: unknown): AdmissionSchedules {
  const row = record(value);
  if (!Array.isArray(row.schedules) || !Array.isArray(row.universities)) throw new ScheduleError('INVALID');
  return { schedules: row.schedules.map(parseAdmissionSchedule), universities: row.universities.map(value => { const university = record(value); return { id: text(university.id), name: text(university.name) }; }) };
}
export function validateAdmissionSchedule(input: AdmissionScheduleInput): string | null {
  if (!input.university_id || !Number.isSafeInteger(input.academic_year) || input.academic_year < 1900 || input.academic_year > 2200 || !input.campus.trim()) return '대학, 학년도, 캠퍼스를 입력해 주세요.';
  if (!input.title.trim() || Array.from(input.title.trim()).length > 15) return 'D-Day 표시 이름은 1~15자로 입력해 주세요.';
  if (!input.admission_names.length || !input.division_names.length || [...input.admission_names, ...input.division_names].some(name => !name.trim())) return '확인 대기 일정도 적용 전형과 모집단위를 각각 입력해 주세요. 전체 적용은 지원하지 않습니다.';
  if (input.source_sha256 && !/^[a-f\d]{64}$/i.test(input.source_sha256)) return '출처 SHA256은 64자리 16진수로 입력해 주세요.';
  try { sourceUrl(input.source_url); dateOnly(input.event_date); } catch { return '날짜와 공식 출처 URL을 확인해 주세요.'; }
  if (input.is_published && input.verification_status !== 'VERIFIED') return '공식 확인을 완료한 일정만 공개할 수 있습니다.';
  if (input.verification_status === 'VERIFIED' && (!input.event_date || !input.source_url || Array.from(input.source_note.trim()).length < 5)) return '공식 확인에는 날짜, 공식 출처와 5자 이상의 검수 근거가 필요합니다.';
  return null;
}
export async function readAdminAdmissionSchedules(client: SupabaseClient, owner: string) {
  return parseAdmissionSchedules(await admissionRpc(client, owner, 'admin_admission_schedules'));
}
export async function saveAdminAdmissionSchedule(client: SupabaseClient, owner: string, id: string | null, revision: number, input: AdmissionScheduleInput, key: string) {
  if (validateAdmissionSchedule(input)) throw new ScheduleError('INVALID');
  return parseAdmissionSchedule(await admissionRpc(client, owner, 'admin_admission_schedule_save', {
    p_id: id, p_expected_revision: revision, p_request_key: key, p_schedule: input,
  }));
}
