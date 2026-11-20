// @vitest-environment jsdom
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AdmissionDayEventsPanel } from './admission-day-events';
import { actOnAdmissionDayEvent, ADMISSION_SCHEDULES_CHANGED, readAdmissionDayEvents, ScheduleError, type AdmissionDayEvent } from '@/lib/my/admission-day-events';
const client = { auth: { getSession: async () => ({ data: { session: { user: { id: 'owner' } } } }) } };
const auth = { status: 'authenticated', user: { id: 'owner' } as { id: string } | null, client, recoveryActive: false };
vi.mock('@/components/auth-context', () => ({ useAuth: () => auth }));
vi.mock('@/lib/my/admission-day-events', async original => ({ ...await original<typeof import('@/lib/my/admission-day-events')>(), readAdmissionDayEvents: vi.fn(), actOnAdmissionDayEvent: vi.fn() }));
const event: AdmissionDayEvent = { official_event_id: 'event-1', day_target_id: 'day-1', title: '아주대학교 논술고사', university_name: '아주대학교', event_type: 'ESSAY', event_date: '2026-12-05', event_time: null, status: 'ACTIVE', source_url: 'https://www.iajou.ac.kr/guide', source_note: '기계공학과 공식 표 확인', revision: 1, can_restore: false, unavailable_reason: null, updated_at: '2026-11-20T00:00:00Z' };
beforeEach(() => {
  vi.clearAllMocks(); auth.status = 'authenticated'; auth.user = { id: 'owner' };
  vi.mocked(readAdmissionDayEvents).mockResolvedValue([event]);
});
it('dismisses immediately and restores only by explicit action using returned revisions', async () => {
  const user = userEvent.setup(); vi.spyOn(window, 'confirm').mockReturnValue(true);
  const dismissed: AdmissionDayEvent = { ...event, status: 'DISMISSED', revision: 2, day_target_id: null, can_restore: true };
  vi.mocked(actOnAdmissionDayEvent).mockResolvedValueOnce(dismissed).mockResolvedValueOnce({ ...event, revision: 3, event_date: '2026-12-06' });
  render(<AdmissionDayEventsPanel />);
  await user.click(await screen.findByRole('button', { name: '아주대학교 논술고사 삭제' }));
  await screen.findByText('일정을 삭제했습니다. 삭제한 입시 일정에서 복원할 수 있습니다.');
  expect(screen.queryByRole('button', { name: '아주대학교 논술고사 삭제' })).toBeNull();
  const summary = screen.getByText('삭제한 입시 일정 (1)'); await user.click(summary);
  await user.click(screen.getByRole('button', { name: '아주대학교 논술고사 복원' }));
  await screen.findByText('최신 공식 날짜로 복원했습니다.');
  expect(screen.getByText('2026.12.06')).toBeVisible();
  expect(vi.mocked(actOnAdmissionDayEvent).mock.calls[0][2].revision).toBe(1);
  expect(vi.mocked(actOnAdmissionDayEvent).mock.calls[1][2].revision).toBe(2);
  expect(vi.mocked(actOnAdmissionDayEvent).mock.calls.map(call => call[3])).toEqual(['dismiss', 'restore']);
});
it('retries an ambiguous command with the same key and does not claim deletion on failure', async () => {
  const user = userEvent.setup(); vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.mocked(actOnAdmissionDayEvent).mockRejectedValueOnce(new ScheduleError('NETWORK')).mockResolvedValueOnce({ ...event, status: 'DISMISSED', day_target_id: null, can_restore: true, revision: 2 });
  render(<AdmissionDayEventsPanel />); await user.click(await screen.findByRole('button', { name: '아주대학교 논술고사 삭제' }));
  await screen.findByRole('alert'); expect(screen.getByRole('button', { name: '아주대학교 논술고사 삭제' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: '아주대학교 논술고사 삭제' }));
  await waitFor(() => expect(actOnAdmissionDayEvent).toHaveBeenCalledTimes(2));
  expect(vi.mocked(actOnAdmissionDayEvent).mock.calls[0][4]).toBe(vi.mocked(actOnAdmissionDayEvent).mock.calls[1][4]);
});
it('keeps unavailable restoration disabled, and never offers cancelled schedules as active', async () => {
  const user = userEvent.setup();
  vi.mocked(readAdmissionDayEvents).mockResolvedValue([{ ...event, status: 'DISMISSED', day_target_id: null, can_restore: false, unavailable_reason: 'SOURCE_CANCELLED' }, { ...event, official_event_id: 'event-2', title: '취소 일정', status: 'CANCELLED', day_target_id: null }]);
  render(<AdmissionDayEventsPanel />); await user.click(await screen.findByText('삭제한 입시 일정 (1)'));
  expect(screen.getByRole('button', { name: '아주대학교 논술고사 복원' })).toBeDisabled();
  expect(screen.getByText('공식 일정이 취소되었습니다.')).toBeVisible();
  expect(screen.queryByText('SOURCE_CANCELLED')).toBeNull();
  expect(screen.queryByText(event.source_note)).toBeNull();
  expect(screen.queryByRole('button', { name: '아주대학교 논술고사 삭제' })).toBeNull();
});
it('distinguishes missing RPC from empty and refreshes after an application mutation', async () => {
  vi.mocked(readAdmissionDayEvents).mockRejectedValueOnce(new ScheduleError('UNAVAILABLE'));
  render(<AdmissionDayEventsPanel />); expect(await screen.findByRole('alert')).toHaveTextContent('준비 중');
  expect(screen.queryByText('표시할 입시 일정이 없습니다.')).toBeNull();
  await act(async () => window.dispatchEvent(new Event(ADMISSION_SCHEDULES_CHANGED)));
  await screen.findByRole('button', { name: '아주대학교 논술고사 삭제' });
  expect(readAdmissionDayEvents).toHaveBeenCalledTimes(2);
});
it('ignores a stale refresh that resolves after a successful dismissal', async () => {
  const user = userEvent.setup(); vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<AdmissionDayEventsPanel />); await screen.findByRole('button', { name: '아주대학교 논술고사 삭제' });
  let complete!: (rows: AdmissionDayEvent[]) => void;
  vi.mocked(readAdmissionDayEvents).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => window.dispatchEvent(new Event('focus')));
  vi.mocked(actOnAdmissionDayEvent).mockResolvedValueOnce({ ...event, status: 'DISMISSED', day_target_id: null, can_restore: true, revision: 2 });
  await user.click(screen.getByRole('button', { name: '아주대학교 논술고사 삭제' }));
  await screen.findByText('일정을 삭제했습니다. 삭제한 입시 일정에서 복원할 수 있습니다.');
  await act(async () => complete([event]));
  expect(screen.queryByRole('button', { name: '아주대학교 논술고사 삭제' })).toBeNull();
});
it('removes personal schedule data synchronously on logout', async () => {
  const { rerender } = render(<AdmissionDayEventsPanel />);
  await screen.findByRole('button', { name: '아주대학교 논술고사 삭제' });
  auth.status = 'anonymous'; auth.user = null; rerender(<AdmissionDayEventsPanel />);
  expect(screen.queryByText('아주대학교 논술고사')).toBeNull();
});
it('keeps a compact list and exposes all events on demand', async () => {
  const user = userEvent.setup();
  vi.mocked(readAdmissionDayEvents).mockResolvedValue(Array.from({ length: 5 }, (_, index) => ({ ...event, official_event_id: `event-${index}`, day_target_id: `day-${index}`, university_name: `대학${index}` })));
  render(<AdmissionDayEventsPanel />); const section = await screen.findByRole('region', { name: '입시 D-Day' });
  await screen.findByRole('button', { name: '일정 2개 더보기' });
  expect(within(section).getAllByRole('article')).toHaveLength(3);
  await user.click(screen.getByRole('button', { name: '일정 2개 더보기' })); expect(within(section).getAllByRole('article')).toHaveLength(5);
});
