// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {addTarget,searchUniversities} from '@/lib/my/data';
import { MyDashboard } from './dashboard';

const OWNER = { id: 'owner-1', email: 'review@legendstudy.com' };

vi.mock('@/components/auth-context', () => ({
  useAuth: () => ({ client: { auth: { getSession: async () => ({ data: { session: { user: OWNER } } }) } }, user: OWNER, status: 'authenticated' }),
}));
vi.mock('@/lib/my/foundation', async importOriginal => ({...await importOriginal<typeof import('@/lib/my/foundation')>(),readApplicationPage:async()=>({items:[],has_more:false,offset:0}),readStudy:async()=>({today_ms:0,week_ms:0,last30_ms:0,daily7:[]})}));
vi.mock('@/components/credit-balance', () => ({
  useCreditSummary: () => ({ state: { status: 'ready', value: { spendable: 3, free: 3, paid: 0, other: 0, next_expiry: '2026-11-01' } }, reload: () => {} }),
}));
vi.mock('@/components/admin/admin-school-name', () => ({ AdminSchoolName: () => <span>서울여자고등학교</span> }));
vi.mock('@/lib/admin/school', () => ({ searchSchools: async () => [] }));
vi.mock('@/lib/my/data', () => ({
  assertOwner: async () => {},
  readMyProfile: async () => ({ neis_office_code: 'B10', neis_school_code: '7130001', academic_status: 'student', grade_level: 2 }),
  readGoals: async () => ({ intended_major: '사회·상경', targets: [{ id: '1', university_id: 'u1', intended_division: '경영학과', universities: { name: '연세대학교' } }] }),
  readEssays: async () => [],
  readHistory: async () => [],
  saveMajor: async () => {},
  addTarget: vi.fn().mockResolvedValue(undefined),
  editTarget: async () => {},
  searchUniversities: vi.fn().mockResolvedValue([]),
  majorOptions: ['사회·상경'],
}));

/**
 * MY is a dashboard, so the order of its sections is the product decision this
 * test protects: identity and usage first, then the student's own record, then
 * the remaining navigation. It also pins that usage is a metric row whose two
 * CTAs are visually ranked, and that an empty section stays a short empty state.
 */
it('presents the MY dashboard sections in the agreed order', async () => {
  const { container } = render(<MyDashboard />);
  await screen.findByText('사회·상경');
  const headings = [...container.querySelectorAll('.my-section > h2')].map((h) => h.textContent);
  expect(headings).toEqual(['내 이용 현황', '나의 학교·학년', '나의 목표', '나의 지원 현황', 'LAB', '나의 학습시간', '계정 및 지원']);
});

it('shows the signed-in email as the identity line and nothing invented beside it', async () => {
  const { container } = render(<MyDashboard />);
  await screen.findByText('사회·상경');
  const identity = container.querySelector('.my-identity');
  expect(identity?.textContent).toBe('review@legendstudy.com');
});

it('shows usage as a metric row with a ranked pair of actions', async () => {
  const { container } = render(<MyDashboard />);
  await screen.findByText('사회·상경');
  const usage = container.querySelector('.my-section') as HTMLElement;
  expect(within(usage).getByText('첨삭권')).toBeTruthy();
  expect(usage.querySelector('.my-metric__value')?.textContent).toBe('3개');
  expect(within(usage).getByText('무료 3 · 구매 0')).toBeTruthy();
  const buy = within(usage).getByRole('link', { name: '첨삭권 구매' });
  const history = within(usage).getByRole('link', { name: '구매·사용 내역' });
  expect(buy.className).toContain('button--primary');
  expect(history.className).toContain('button--outline');
});

it('keeps school and grade as facts and drops raw profile columns', async () => {
  const { container } = render(<MyDashboard />);
  await screen.findByText('재학생');
  const facts = container.querySelector('.my-facts') as HTMLElement;
  expect(within(facts).getByText('현재 상태')).toBeTruthy();
  expect(within(facts).getByText('재학생')).toBeTruthy();
  expect(within(facts).getByText('2학년')).toBeTruthy();
  expect(container.textContent).not.toContain('설정 안 함');
  expect(container.textContent).not.toContain('미설정');
});

it('keeps the university search closed until the student asks for it', async () => {
  const { container } = render(<MyDashboard />);
  await screen.findByText('사회·상경');
  expect(within(container).getByRole('button', { name: '+ 대학·학과 추가' })).toBeTruthy();
  expect(container.querySelector('.my-goals input')).toBeNull();
});

it('keeps empty sections short instead of making a large empty card', async () => {
  const { container } = render(<MyDashboard />);
  await screen.findByText('사회·상경');
  const empty = [...container.querySelectorAll('.my-empty')].map((p) => p.textContent);
  expect(empty).toContain('등록된 지원 내역이 없습니다.');
  expect(within(container).getByRole('link', { name: /논술 LAB.*내 논술/ })).toHaveAttribute('href','/account/essay');
  expect(container.textContent).not.toContain('아직 구현되지 않았습니다');
});
it('keeps same-university add disabled while the target constraint rollout is held',async()=>{
 const user=userEvent.setup();vi.mocked(searchUniversities).mockResolvedValueOnce([{id:'u1',name:'연세대학교'}]);
 render(<MyDashboard/>);await screen.findByText('사회·상경');
 await user.click(screen.getByRole('button',{name:'+ 대학·학과 추가'}));
 await user.type(screen.getByLabelText('대학 찾기'),'연세');await user.click(screen.getByRole('button',{name:'검색'}));
 expect(await screen.findByRole('button',{name:'추가'})).toBeDisabled();
 expect(addTarget).not.toHaveBeenCalled();
});
