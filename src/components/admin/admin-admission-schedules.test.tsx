// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthContext, type AuthContextValue } from '@/components/auth-context';
import { AdmissionScheduleForm } from './admin-admission-schedules';
import Page from '@/app/admin/admission-schedules/page';
import { ScheduleError } from '@/lib/my/admission-day-events';
import type { AdmissionSchedule } from '@/lib/admin/admission-schedules';
const universities = [{ id: 'u1', name: '아주대학교' }];
const existing: AdmissionSchedule = { id: 'event-a', revision: 4, university_id: 'u1', university_name: '아주대학교', academic_year: 2027, campus: '수원', title: '아주대학교 논술고사', event_type: 'ESSAY', event_date: '2026-12-05', event_time: null, admission_names: ['수리논술'], division_names: ['기계공학과'], source_url: 'https://www.iajou.ac.kr/guide.pdf', source_sha256: null, source_page: null, source_note: '자연계열 공식 표 확인', verification_status: 'VERIFIED', is_published: true };
it('lets an operator prepare a source-less pending draft without publishing it', async () => {
  const user = userEvent.setup(); const save = vi.fn().mockResolvedValue(undefined);
  render(<AdmissionScheduleForm initial={null} universities={universities} schedules={[]} save={save} />);
  await user.selectOptions(screen.getByLabelText('대학 선택'), 'u1');
  await user.type(screen.getByLabelText('캠퍼스'), '수원'); await user.type(screen.getByLabelText(/D-Day 표시 이름/), '아주 논술');
  await user.type(screen.getByLabelText(/적용 전형 이름/), '논술우수자전형'); await user.type(screen.getByLabelText(/모집단위 적용 범위/), '기계공학과');
  expect(screen.getByLabelText('학생에게 공개')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '일정 저장' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).toMatchObject({ verification_status: 'PENDING', is_published: false, event_date: null, source_url: null });
});
it('blocks verification without a date, official source and exact scope', async () => {
  const user = userEvent.setup(); const save = vi.fn();
  render(<AdmissionScheduleForm initial={null} universities={universities} schedules={[]} save={save} />);
  await user.selectOptions(screen.getByLabelText('대학 선택'), 'u1'); await user.type(screen.getByLabelText('캠퍼스'), '수원'); await user.type(screen.getByLabelText(/D-Day 표시 이름/), '아주 논술');
  await user.selectOptions(screen.getByLabelText('검증 상태'), 'VERIFIED'); await user.click(screen.getByLabelText('학생에게 공개'));
  await user.click(screen.getByRole('button', { name: '일정 저장' })); expect(await screen.findByRole('alert')).toHaveTextContent('전형과 모집단위'); expect(save).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText(/적용 전형 이름/), '논술우수자전형'); await user.type(screen.getByLabelText(/모집단위 적용 범위/), '기계공학과');
  await user.click(screen.getByRole('button', { name: '일정 저장' })); expect(await screen.findByRole('alert')).toHaveTextContent('공식 확인에는'); expect(save).not.toHaveBeenCalled();
});
it('retains stable identity and reviewed scopes when changing date; retries use one key', async () => {
  const user = userEvent.setup(); const save = vi.fn().mockRejectedValueOnce(new ScheduleError('NETWORK')).mockResolvedValueOnce(undefined);
  render(<AdmissionScheduleForm initial={existing} universities={universities} schedules={[existing]} save={save} />);
  for (const label of ['대학 선택', '학년도', '캠퍼스', '일정 유형']) expect(screen.getByLabelText(label)).toBeDisabled();
  const date = screen.getByLabelText('날짜 (KST)'); await user.clear(date); await user.type(date, '2026-12-06');
  await user.click(screen.getByRole('button', { name: '일정 저장' })); await screen.findByRole('alert');
  await user.click(screen.getByRole('button', { name: '일정 저장' })); await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[0][0]).toMatchObject({ event_date: '2026-12-06', university_id: 'u1', academic_year: 2027, admission_names: ['수리논술'], division_names: ['기계공학과'] });
  expect(save.mock.calls[0][1]).toBe(save.mock.calls[1][1]);
});
it('unpublishes automatically when verification is withdrawn', async () => {
  const user = userEvent.setup(); const save = vi.fn().mockResolvedValue(undefined);
  render(<AdmissionScheduleForm initial={existing} universities={universities} schedules={[existing]} save={save} />);
  await user.selectOptions(screen.getByLabelText('검증 상태'), 'CANCELLED'); expect(screen.getByLabelText('학생에게 공개')).not.toBeChecked();
  await user.click(screen.getByRole('button', { name: '일정 저장' })); await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).toMatchObject({ verification_status: 'CANCELLED', is_published: false });
});
it('keeps the schedule page behind the existing server operator gate', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
  const value: AuthContextValue = { status: 'authenticated', user: { id: 'student' }, recoveryActive: false, completeRecovery: () => {}, signOut: async () => {}, client: { rpc, auth: { getSession: async () => ({ data: { session: { user: { id: 'student' } } } }) } } as unknown as SupabaseClient };
  render(<AuthContext.Provider value={value}><Page /></AuthContext.Provider>);
  await screen.findByText('운영자 권한이 없습니다');
  expect(rpc).toHaveBeenCalledWith('admin_operator', undefined);
  expect(rpc).toHaveBeenCalledTimes(1); expect(screen.queryByRole('button', { name: '일정 저장' })).toBeNull();
});
