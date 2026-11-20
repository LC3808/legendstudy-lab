import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { actOnAdmissionDayEvent, admissionDayLabel, parseAdmissionDayEvents, readAdmissionDayEvents, ScheduleError, scheduleErrorCopy, unavailableScheduleCopy, type AdmissionDayEvent } from './admission-day-events';
import { parseAdmissionSchedules, saveAdminAdmissionSchedule, validateAdmissionSchedule, type AdmissionScheduleInput } from '@/lib/admin/admission-schedules';

export const eventFixture: AdmissionDayEvent = {
  official_event_id: 'event-a', day_target_id: 'day-a', title: '아주대학교 논술고사', university_name: '아주대학교', event_type: 'ESSAY',
  event_date: '2026-12-05', event_time: null, status: 'ACTIVE', source_url: 'https://www.iajou.ac.kr/guide.pdf', source_note: '기계공학과 자연계열', revision: 1, can_restore: false, unavailable_reason: null, updated_at: '2026-11-20T00:00:00Z',
};
const input: AdmissionScheduleInput = { university_id: 'university', academic_year: 2027, campus: '수원', title: '아주대학교 논술고사', event_type: 'ESSAY', event_date: '2026-12-05', event_time: null, admission_names: ['수리논술'], division_names: ['기계공학과'], source_url: eventFixture.source_url, source_sha256: null, source_page: null, source_note: '공식 표 확인', verification_status: 'VERIFIED', is_published: true };
function mockClient(data: unknown, error: unknown = null) {
  return { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'owner' } } } }) }, rpc: vi.fn().mockResolvedValue({ data, error }) };
}
describe('admission day event boundary', () => {
  it('uses the server self boundary, keeps no owner or inferred date in RPC arguments', async () => {
    const client = mockClient({ events: [eventFixture] });
    expect(await readAdmissionDayEvents(client as unknown as SupabaseClient, 'owner')).toEqual([eventFixture]);
    expect(client.rpc).toHaveBeenCalledWith('my_admission_day_events', undefined);
  });
  it('does not send a command for the wrong session and rejects in-flight account changes', async () => {
    const client = mockClient({ events: [] });
    await expect(readAdmissionDayEvents(client as unknown as SupabaseClient, 'other')).rejects.toThrow('ACCOUNT_CHANGED');
    expect(client.rpc).not.toHaveBeenCalled();
    client.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'owner' } } } }).mockResolvedValueOnce({ data: { session: { user: { id: 'other' } } } });
    await expect(readAdmissionDayEvents(client as unknown as SupabaseClient, 'owner')).rejects.toThrow('ACCOUNT_CHANGED');
  });
  it('passes stable action/revision/idempotency and never deletes a source or application', async () => {
    const dismissed = { ...eventFixture, status: 'DISMISSED', day_target_id: null, revision: 2, can_restore: true };
    const client = mockClient(dismissed);
    expect(await actOnAdmissionDayEvent(client as unknown as SupabaseClient, 'owner', eventFixture, 'dismiss', 'same-key')).toMatchObject({ status: 'DISMISSED', revision: 2 });
    expect(client.rpc).toHaveBeenCalledWith('my_admission_day_event_action', { p_event_id: 'event-a', p_action: 'dismiss', p_expected_revision: 1, p_request_key: 'same-key' });
    expect(client.rpc).toHaveBeenCalledTimes(1);
  });
  it.each([['PGRST202', 'UNAVAILABLE'], ['42501', 'FORBIDDEN'], ['40001', 'CHANGED']])('distinguishes %s from an empty schedule list', async (code, kind) => {
    const client = mockClient(null, { code, message: 'private diagnostic' });
    await expect(readAdmissionDayEvents(client as unknown as SupabaseClient, 'owner')).rejects.toEqual(new ScheduleError(kind as 'UNAVAILABLE'));
  });
  it('rejects duplicate, unsafe, impossible, and unprojected active data', () => {
    expect(() => parseAdmissionDayEvents({ events: [eventFixture, eventFixture] })).toThrow();
    expect(() => parseAdmissionDayEvents({ events: [{ ...eventFixture, source_url: 'javascript:alert(1)' }] })).toThrow();
    expect(() => parseAdmissionDayEvents({ events: [{ ...eventFixture, event_date: '2026-02-30' }] })).toThrow();
    expect(() => parseAdmissionDayEvents({ events: [{ ...eventFixture, day_target_id: null }] })).toThrow();
    expect(() => parseAdmissionDayEvents({ events: [{ ...eventFixture, status: 'PENDING' }] })).toThrow();
  });
  it.each([['AMBIGUOUS_CAMPUS_SCOPE', 'AMBIGUOUS_SCOPE'], ['DUPLICATE_EVENT_SCOPE_USE_EXISTING', 'DUPLICATE_SCOPE'], ['EVENT_IDENTITY_IMMUTABLE', 'IMMUTABLE_IDENTITY']])('shows actionable Korean copy for %s without exposing diagnostics', async (message, kind) => {
    const client = mockClient(null, { code: 'P0001', message });
    try { await readAdmissionDayEvents(client as unknown as SupabaseClient, 'owner'); throw new Error('unexpected success'); }
    catch (error) { expect(error).toEqual(new ScheduleError(kind as 'AMBIGUOUS_SCOPE')); expect(scheduleErrorCopy(error)).not.toContain(message); }
  });
  it('only renders bounded Korean availability reasons', () => {
    for (const reason of ['SOURCE_PENDING', 'SOURCE_CANCELLED', 'NOT_PUBLISHED', 'APPLICATION_NOT_MATCHED', 'PAST_EVENT', 'private internal provenance']) expect(unavailableScheduleCopy(reason)).not.toContain(reason);
  });
  it('uses the KST date boundary, including leap date and past dates', () => {
    expect(admissionDayLabel('2026-11-21', new Date('2026-11-20T14:59:59Z'))).toBe('D-1');
    expect(admissionDayLabel('2026-11-21', new Date('2026-11-20T15:00:00Z'))).toBe('D-DAY');
    expect(admissionDayLabel('2026-11-20', new Date('2026-11-20T15:00:00Z'))).toBe('지난 일정');
    expect(admissionDayLabel('2028-02-29', new Date('2028-02-28T00:00:00Z'))).toBe('D-1');
  });
});
describe('admin official schedule boundary', () => {
  it('allows a source-less pending draft while requiring explicit scope and official evidence for verification', () => {
    expect(validateAdmissionSchedule({ ...input, source_url: null, source_note: '', event_date: null, verification_status: 'PENDING', is_published: false })).toBeNull();
    expect(validateAdmissionSchedule({ ...input, source_url: null })).toContain('공식 확인');
    expect(validateAdmissionSchedule({ ...input, division_names: [] })).toContain('모집단위');
    expect(validateAdmissionSchedule({ ...input, verification_status: 'PENDING', is_published: false, admission_names: [] })).toContain('확인 대기');
    expect(validateAdmissionSchedule({ ...input, source_note: '확인' })).toContain('5자');
    expect(validateAdmissionSchedule({ ...input, verification_status: 'PENDING' })).toContain('공개');
    expect(validateAdmissionSchedule(input)).toBeNull();
  });
  it('saves exact reviewed names and the stable event revision without client owner claims', async () => {
    const saved = { ...input, id: 'event-a', revision: 2, university_name: '아주대학교' };
    const client = mockClient(saved);
    await saveAdminAdmissionSchedule(client as unknown as SupabaseClient, 'owner', 'event-a', 1, input, 'retry-key');
    expect(client.rpc).toHaveBeenCalledWith('admin_admission_schedule_save', { p_id: 'event-a', p_expected_revision: 1, p_request_key: 'retry-key', p_schedule: input });
    expect(parseAdmissionSchedules({ schedules: [saved], universities: [{ id: 'university', name: '아주대학교' }] }).schedules).toHaveLength(1);
  });
});
