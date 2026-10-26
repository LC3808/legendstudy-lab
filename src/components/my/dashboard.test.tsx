// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {addTarget,searchUniversities,readHistory} from '@/lib/my/data';
import { MyDashboard, CreditHistory } from './dashboard';

vi.mock('@/lib/my/essay-dashboard',async original=>({...await original<typeof import('@/lib/my/essay-dashboard')>(),readEssayDashboard:async()=>[],readMathDashboard:async()=>[]}));

const OWNER = { id: 'owner-1', email: 'review@legendstudy.com' };

vi.mock('@/components/auth-context', () => ({
  useAuth: () => ({ client: { auth: { getSession: async () => ({ data: { session: { user: OWNER } } }) } }, user: OWNER, status: 'authenticated' }),
}));
vi.mock('@/lib/my/foundation', async importOriginal => ({...await importOriginal<typeof import('@/lib/my/foundation')>(),readApplicationPage:async()=>({items:[],has_more:false,offset:0}),readStudy:async()=>({today_ms:0,week_ms:0,last30_ms:0,daily7:[]}),readEssaySummary:async()=>({sessions:[],points:[],hasMoreSessions:false,hasMoreEvaluations:false})}));
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
  readHistory: vi.fn().mockResolvedValue([]),
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
  expect(headings).toEqual(['나의 프로필', '나의 대학 관리', '내 이용 현황', 'LAB', '나의 성장', '나의 학습 시간', '계정 및 지원']);
});

it('leads with the email as the profile name when no nickname is set, and never prints it twice', async () => {
  const { container } = render(<MyDashboard />);
  await screen.findByText('사회·상경');
  const name = container.querySelector('.my-profile-card__name');
  expect(name?.textContent).toBe('');
  expect(container.querySelector('.my-profile-card__identity .my-identity__email')?.textContent).toBe('review@legendstudy.com');
});

it('shows usage as a metric row with a ranked pair of actions', async () => {
  const { container } = render(<MyDashboard />);
  await screen.findByText('사회·상경');
  const usage = [...container.querySelectorAll('.my-section')].find((s) => s.querySelector('h2')?.textContent === '내 이용 현황') as HTMLElement;
  expect(within(usage).getByText('크레딧')).toBeTruthy();
  expect(usage.querySelector('.my-metric__value')?.textContent).toBe('3개');
  expect(within(usage).getByText('무료 3 · 구매 0 · 기타 지급 0')).toBeTruthy();
  const buy = within(usage).getByRole('link', { name: '크레딧 구매' });
  const history = within(usage).getByRole('link', { name: '구매·사용 내역' });
  expect(buy.className).toContain('button--primary');
  expect(history.className).toContain('button--outline');
});

it('keeps school and grade as facts and drops raw profile columns', async () => {
  const { container } = render(<MyDashboard />);
  await screen.findAllByText('재학생');
  const facts = container.querySelector('.my-profile-card__facts') as HTMLElement;
  expect(within(facts).getByText('현재 상태')).toBeTruthy();
  expect(within(facts).getByText('재학생')).toBeTruthy();
  expect(within(facts).getByText('2학년')).toBeTruthy();
  expect(container.textContent).not.toContain('설정 안 함');
  expect(container.textContent).not.toContain('미설정');
});

it('keeps the university search closed until the student asks for it', async () => {
  const { container } = render(<MyDashboard />);
  await screen.findByText('사회·상경');
  expect(within(container).getByRole('button', { name: '+ 관심 대학 추가' })).toBeTruthy();
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
 await user.click(screen.getByRole('button',{name:'+ 관심 대학 추가'}));
 await user.type(screen.getByLabelText('대학 찾기'),'연세');await user.click(screen.getByRole('button',{name:'검색'}));
 expect(await screen.findByRole('button',{name:'선택'})).toBeDisabled();
 expect(addTarget).not.toHaveBeenCalled();
});

it('renders only date, signed quantity and user reason in purchase history',async()=>{
 vi.mocked(readHistory).mockResolvedValueOnce([{id:'private-id',label:'관리자 지급 · 테스트',delta:2,at:'2026-10-09T00:00:00Z'}]);
 render(<CreditHistory/>);
 const table=await screen.findByRole('table');
 expect(within(table).getAllByRole('columnheader').map(el=>el.textContent)).toEqual(['날짜','개수','사유']);
 expect(within(table).getAllByRole('cell').map(el=>el.textContent)).toEqual(['2026. 10. 9.','+2 크레딧','관리자 지급 · 테스트']);
 expect(table).not.toHaveTextContent('private-id');
});

vi.mock('next/navigation',()=>({useRouter:()=>({back:vi.fn(),replace:vi.fn()})}));
it('saves the selected university and intended division together',async()=>{
 const u=userEvent.setup();vi.mocked(searchUniversities).mockResolvedValueOnce([{id:'new',name:'새대학교'}]);
 render(<MyDashboard/>);await screen.findByText('사회·상경');await u.click(screen.getByRole('button',{name:'+ 관심 대학 추가'}));
 await u.type(screen.getByLabelText('대학 찾기'),'새대');await u.click(screen.getByRole('button',{name:'검색'}));
 await u.click(await screen.findByRole('button',{name:'선택'}));await u.type(screen.getByLabelText('희망 학과·모집단위'),'경제학과');await u.click(screen.getByRole('button',{name:'저장'}));
 expect(addTarget).toHaveBeenCalledWith(expect.anything(),'owner-1','new','경제학과');
});

it('prefills an explicit application form from a target without creating a record', async () => {
 const user=userEvent.setup();
 const {container}=render(<MyDashboard/>);
 await screen.findByText('사회·상경');
 const targets=container.querySelector('.my-college-grid > div:first-child') as HTMLElement;
 await user.click(within(targets).getByRole('button',{name:'지원 내역 추가'}));
 expect((screen.getByLabelText('지원 학과·모집단위') as HTMLInputElement).value).toBe('경영학과');
 expect(container.querySelector('.my-profile-card .my-target-list')).toBeNull();
 expect(screen.getByText('등록된 지원 내역이 없습니다.')).toBeTruthy();
});
